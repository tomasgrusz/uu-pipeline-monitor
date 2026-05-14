import amqplib, { Channel } from 'amqplib';

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

    // Set QoS (prefetch count = 1 to ensure one message per consumer at a time)
    await channel.prefetch(1);

    console.log('✅ Connected to RabbitMQ');
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
export async function publishPipelineRun(pipelineId: string, triggeredBy: string = 'api'): Promise<void> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const message = {
    pipelineId,
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
 */
export async function consumePipelineRuns(
  handler: (message: { pipelineId: string; timestamp: string; triggeredBy: string }) => Promise<void>
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
      console.log(`📥 Processing pipeline run: ${content.pipelineId}`);

      // Call the handler
      await handler(content);

      // Acknowledge the message after successful processing
      channel!.ack(msg);
      console.log(`✅ Acknowledged pipeline run: ${content.pipelineId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error processing pipeline run:', errorMsg);
      console.error(error);
      // Reject the message and requeue it
      try {
        channel!.nack(msg, false, true);
        console.log(`🔄 Rejected and requeued message`);
      } catch (nackError) {
        console.error('Failed to nack message:', nackError);
      }
    }
  }, { noAck: false });

  console.log('✅ Consumer started - listening for pipeline runs on RabbitMQ...');
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
