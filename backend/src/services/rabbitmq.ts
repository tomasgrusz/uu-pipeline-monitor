import amqplib, { Channel } from 'amqplib';
import { acquireDatasetLock, isDatasetLocked } from './datasetLock';
import { getDatasetIdForPipeline } from './helpers';
import { jobRuns } from '../schema';
import { db } from '../db';
import { eq } from 'drizzle-orm/sql/expressions/conditions';

let connection: any = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const PIPELINE_QUEUE = 'pipeline.runs';
const EXCHANGE_NAME = 'pipeline.exchange';

/**
 * Connect to RabbitMQ and set up channels
 */
export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = (await connection.createChannel()) as Channel;

    // Set up exchange
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });

    // Set up queue
    await channel.assertQueue(PIPELINE_QUEUE, { durable: true });

    // Bind queue to exchange
    await channel.bindQueue(PIPELINE_QUEUE, EXCHANGE_NAME, 'pipeline.trigger');

    // Set QoS: prefetch 10 to allow multiple pipelines to run in parallel
    // Pipelines will only execute on different datasets, so this enables parallelism
    // without risking data conflicts
    await channel.prefetch(10);

    console.log('✅ Connected to RabbitMQ (prefetch: 10 - allows parallel execution of pipelines on different datasets)');
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

/**
 * Disconnect from RabbitMQ
 */
export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await (channel as any).close();
    }
    if (connection) {
      await (connection as any).close();
    }
    console.log('⏹️  Disconnected from RabbitMQ');
  } catch (error) {
    console.error('Failed to disconnect from RabbitMQ:', error);
  }
}

/**
 * Publish a pipeline trigger message to the queue
 */
export async function publishPipelineRun(pipelineId: string, pipelineVersion: number, triggeredBy: string = 'api'): Promise<void> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const jobRun = await db
        .insert(jobRuns)
        .values({
          pipelineId,
          pipelineVersion: pipelineVersion,
          status: 'pending',
          createdAt: new Date()
        })
        .returning();

  const message = {
    pipelineId,
    jobRunId: jobRun[0].id,
    timestamp: new Date().toISOString(),
    triggeredBy,
  };

  try {
    const ok = channel.publish(
      EXCHANGE_NAME,
      'pipeline.trigger',
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    
    if (!ok) {
      // Set job run to failed in database since we couldn't publish the message
      await db
        .update(jobRuns)
        .set({ status: 'failed', errorMessage: 'Failed to publish message to RabbitMQ' })
        .where(eq(jobRuns.id, jobRun[0].id));

      throw new Error('Failed to publish message to RabbitMQ');
    }
    
    console.log(`📤 Published pipeline run: ${pipelineId} (triggered by: ${triggeredBy})`);
  } catch (error) {
    console.error(`❌ Failed to publish pipeline run: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/**
 * Subscribe to pipeline run messages and process them
 * Pipelines are executed concurrently, but pipelines on the same dataset
 * are queued to prevent data conflicts.
 */
export async function consumePipelineRuns(
  handler: (message: { jobRunId: string; pipelineId: string; timestamp: string; triggeredBy: string }) => Promise<void>
): Promise<void> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  console.log('🔄 Setting up message consumer...');
  
  await channel.consume(PIPELINE_QUEUE, async (msg) => {
    if (!msg) {
      console.warn('⚠️  Received null message from queue');
      return;
    }

    try {
      const content = JSON.parse(msg.content.toString());
      console.log(`📥 Processing job run: ${content.jobRunId}`);

      // Before processing, check if the dataset is locked. If it is, we throw an error to trigger a requeue.
      // Get datasetId for this pipeline
      const datasetId = await getDatasetIdForPipeline(content.pipelineId);

      // Check if dataset is locked
      if (isDatasetLocked(datasetId)) {
        throw new Error(`REQUEUE: Dataset for pipeline ${content.pipelineId} is locked`);
      }

      // Acquire lock for this dataset
      const lockAcquired = acquireDatasetLock(datasetId, content.pipelineId);
      if (!lockAcquired) {
        console.log(`⏳ Failed to acquire lock for dataset ${datasetId}`);
        console.log(`   ➜ Requeuing message to try again later`);
        throw new Error(`REQUEUE: Could not acquire lock for dataset ${datasetId}`);
      }

      console.log(`✅ Lock acquired for dataset: ${datasetId}`);
      console.log(`⏳ Starting job execution: ${content.jobRunId}`);

      await db
        .update(jobRuns)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(jobRuns.id, content.jobRunId));

      // Call the handler
      content.datasetId = datasetId; // Pass datasetId to handler
      await handler(content);

      // Acknowledge the message after successful processing
      channel!.ack(msg);
      console.log(`✅ Acknowledged job run: ${content.jobRunId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check if this is a requeue error (dataset is locked)
      if (errorMsg.includes('REQUEUE:')) {
        console.log(`⏳ Dataset conflict - waiting 10 seconds before retry...`);
        console.log(`   ${errorMsg.split(':')[1]?.trim()}`);
        
        // Wait 10 seconds before requeuing to avoid busy waiting
        await new Promise((resolve) => setTimeout(resolve, 10000));
        
        // Requeue the message
        try {
          channel!.nack(msg, false, true);
          console.log(`🔄 Message requeued after 10s delay`);
        } catch (nackError) {
          console.error('Failed to nack message:', nackError);
        }
      } else {
        // Permanent error - don't requeue
        console.error('❌ Error processing pipeline run:', errorMsg);
        console.error(error);
        try {
          channel!.nack(msg, false, false); // Don't requeue on permanent errors
          console.log(`❌ Message rejected (not requeued - permanent error)`);
        } catch (nackError) {
          console.error('Failed to nack message:', nackError);
        }
      }
    }
  }, { noAck: false });

  console.log('✅ Consumer started - listening for pipeline runs on RabbitMQ...');
  console.log('   Pipelines on different datasets will run in parallel');
  console.log('   Pipelines on the same dataset will queue automatically');
}

/**
 * Get channel for direct access if needed
 */
export function getChannel(): Channel | null {
  return channel;
}

/**
 * Get connection for monitoring/debugging
 */
export function getConnection(): any {
  return connection;
}
