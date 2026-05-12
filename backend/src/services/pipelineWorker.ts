import { db } from '../db';
import { jobRuns, jobRunSteps, pipelineVersions } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { evaluateAlertsForRun } from './pipelineService';

/**
 * Process a pipeline run message from RabbitMQ
 * This is called when a message arrives in the pipeline.runs queue
 */
export async function handlePipelineRun(message: {
  pipelineId: string;
  timestamp: string;
  triggeredBy: string;
}): Promise<void> {
  const { pipelineId, timestamp, triggeredBy } = message;

  console.log(`\n⏳ Starting pipeline execution: ${pipelineId}`);
  console.log(`   Triggered by: ${triggeredBy}`);
  console.log(`   Timestamp: ${timestamp}`);

  try {
    // Get the latest pipeline version
    const latestVersion = await db
      .select()
      .from(pipelineVersions)
      .where(eq(pipelineVersions.pipelineId, pipelineId))
      .orderBy(desc(pipelineVersions.version))
      .limit(1);

    if (latestVersion.length === 0) {
      throw new Error(`No pipeline versions found for pipeline ${pipelineId}`);
    }

    const version = latestVersion[0];

    // Create a new job run
    const jobRun = await db
      .insert(jobRuns)
      .values({
        pipelineId,
        pipelineVersion: version.version,
        status: 'running',
        startedAt: new Date(),
      })
      .returning();

    const runId = jobRun[0].id;
    console.log(`   ✓ Created job run: ${runId}`);

    // Simulate pipeline execution
    // In production, this would:
    // 1. Execute the actual pipeline (Spark job, SQL query, etc.)
    // 2. Track progress and create job run steps
    // 3. Capture results and logs
    // 4. Update run status based on execution result

    console.log(`   ⚙️  Executing pipeline (simulated)...`);
    const executionResult = await simulateExecutionWithSteps(runId);

    // Update run with result
    const finalStatus = executionResult.success ? 'success' : 'failed';
    const errorMessage = executionResult.success ? null : executionResult.errorMessage;

    await db
      .update(jobRuns)
      .set({
        status: finalStatus,
        finishedAt: new Date(),
        recordsProcessed: executionResult.recordsProcessed,
        errorMessage: errorMessage,
      })
      .where(eq(jobRuns.id, runId));

    if (executionResult.success) {
      console.log(`   ✓ Pipeline execution completed: ${runId}`);
    } else {
      console.log(`   ❌ Pipeline execution failed: ${errorMessage}`);
    }

    // Evaluate alert rules
    console.log(`   🔔 Evaluating alert rules...`);
    await evaluateAlertsForRun(runId);

    console.log(`✅ Pipeline run completed: ${runId}\n`);
  } catch (error) {
    console.error(`❌ Pipeline execution failed:`, error);
    // In production, update the run with error status
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
    const willFail = failChance < 0.01;

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
