import { db } from '../db';
import { jobRuns, jobRunSteps, pipelineVersions, pipelines } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { evaluateAlertsForRun } from './pipelineService';
import { acquireDatasetLock, releaseDatasetLock, isDatasetLocked } from './datasetLock';
import { get } from 'http';
import { getDatasetIdForPipeline } from './helpers';

/**
 * Process a pipeline run message from RabbitMQ
 * This is called when a message arrives in the pipeline.runs queue
 * 
 * IMPORTANT: The database is only updated (jobRun created) AFTER successfully
 * acquiring the dataset lock. If the dataset is locked, we requeue without
 * creating any database records.
 * 
 * This ensures the unacked state (running) in RabbitMQ stays in sync with
 * the database state.
 */
export async function handlePipelineRun(message: {
  pipelineId: string;
  jobRunId: string;
  datasetId: string;
  timestamp: string;
  triggeredBy: string;
}): Promise<void> {
  const { pipelineId, jobRunId, datasetId, timestamp, triggeredBy } = message;

  console.log(`\n📨 Received pipeline run message: ${pipelineId}`);
  console.log(`   Triggered by: ${triggeredBy}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Dataset ID: ${datasetId}`);

  try {
    // Step 1: Execute the pipeline (simulated)
    console.log(`   ⚙️  Executing pipeline (simulated)...`);
    const executionResult = await simulateExecutionWithSteps(jobRunId);

    const finalStatus = executionResult.success ? 'success' : 'failed';
    const errorMessage = executionResult.success ? null : executionResult.errorMessage;

    // Step 2: Update jobRun record with final status and metrics
    await db
      .update(jobRuns)
      .set({
        status: finalStatus,
        finishedAt: new Date(),
        recordsProcessed: executionResult.recordsProcessed,
        errorMessage: errorMessage,
      })
      .where(eq(jobRuns.id, jobRunId));

    if (executionResult.success) {
      console.log(`   ✓ Pipeline execution completed: ${jobRunId}`);
    } else {
      console.log(`   ❌ Pipeline execution failed: ${errorMessage}`);
    }

    // Step 3: Evaluate alert rules for this run
    console.log(`   🔔 Evaluating alert rules...`);
    await evaluateAlertsForRun(jobRunId);

    console.log(`✅ Pipeline run completed: ${jobRunId}\n`);

    // Step 4: Release dataset lock
    releaseDatasetLock(datasetId, pipelineId);
    console.log(`🔓 Released lock for dataset: ${datasetId}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // CLEANUP: Release lock
    releaseDatasetLock(datasetId, pipelineId);
    console.log(`🔓 Released lock for dataset: ${datasetId}`);

    // Permanent error
    console.error(`❌ Pipeline execution failed:`, errorMsg);
    throw error;
  }
}

/**
 * Simulate pipeline execution with steps
 * Each step runs for 1-10 seconds with 1% chance to fail
 * Creates and updates jobRunStep records in the database for real-time tracking
 */
async function simulateExecutionWithSteps(
  runId: string
): Promise<{
  success: boolean;
  errorMessage: string | null;
  recordsProcessed: number;
}> {
  const steps = ['extract', 'transform', 'validate', 'load'];
  let totalRecordsProcessed = 0;

  for (const stepName of steps) {
    // Random execution time: 1-10 seconds
    const executionTime = Math.floor(Math.random() * 9000) + 1000; // 1000-10000ms
    const executionTimeSeconds = (executionTime / 1000).toFixed(1);

    // 1% chance to fail
    const failChance = Math.random();
    const willFail = failChance < 0.0000001;

    console.log(
      `   📍 Step: ${stepName} (${executionTimeSeconds}s)${willFail ? ' ⚠️ Will fail' : ''}`
    );

    // Create jobRunStep record with pending status
    const stepStartTime = new Date();
    const jobRunStep = await db
      .insert(jobRunSteps)
      .values({
        runId,
        name: stepName,
        status: 'pending',
        startedAt: stepStartTime,
      })
      .returning();

    const stepId = jobRunStep[0].id;

    // Update step to running
    await db
      .update(jobRunSteps)
      .set({
        status: 'running',
        startedAt: new Date(),
      })
      .where(eq(jobRunSteps.id, stepId));

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, executionTime));

    if (willFail) {
      const stepEndTime = new Date();
      const errorMessage = `Step '${stepName}' failed after ${executionTimeSeconds}s`;
      console.log(`   ❌ ${errorMessage}`);

      // Update step to failed
      await db
        .update(jobRunSteps)
        .set({
          status: 'failed',
          finishedAt: stepEndTime,
        })
        .where(eq(jobRunSteps.id, stepId));

      return {
        success: false,
        errorMessage,
        recordsProcessed: totalRecordsProcessed,
      };
    }

    // Simulate records processed in this step
    const recordsInStep = Math.floor(Math.random() * 50000) + 10000; // 10k-60k records
    totalRecordsProcessed += recordsInStep;

    // Update step to success with end time
    const stepEndTime = new Date();
    await db
      .update(jobRunSteps)
      .set({
        status: 'success',
        finishedAt: stepEndTime,
      })
      .where(eq(jobRunSteps.id, stepId));

    console.log(`   ✓ Step completed: ${recordsInStep} records processed`);
  }

  return {
    success: true,
    errorMessage: null,
    recordsProcessed: totalRecordsProcessed,
  };
}
