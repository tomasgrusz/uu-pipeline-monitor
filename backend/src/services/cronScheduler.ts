import cron, { ScheduledTask } from 'node-cron';
import { db } from '../db';
import { pipelines } from '../schema';
import { eq } from 'drizzle-orm';
import { publishPipelineRun } from './rabbitmq';

interface ScheduledPipeline {
  pipelineId: string;
  task: ScheduledTask;
}

const scheduledTasks = new Map<string, ScheduledPipeline>();

/**
 * Start the cron scheduler - reads all active pipelines with schedules
 * and sets up cron jobs to trigger them at specified times
 */
export async function startCronScheduler() {
  console.log('🕐 Starting cron scheduler...');

  try {
    // Get all active pipelines with schedules
    const activePipelines = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.active, true));

    let scheduledCount = 0;

    for (const pipeline of activePipelines) {
      if (pipeline.schedule && cron.validate(pipeline.schedule)) {
        try {
          const task = cron.schedule(
            pipeline.schedule,
            async () => {
              console.log(
                `⏰ Cron triggered: ${pipeline.name} (${pipeline.schedule})`
              );
              try {
                await publishPipelineRun(pipeline.id, 'cron');
                console.log(`   ✓ Published to RabbitMQ`);
              } catch (error) {
                console.error(
                  `   ✗ Failed to publish:`,
                  error instanceof Error ? error.message : error
                );
              }
            }
          );

          scheduledTasks.set(pipeline.id, { pipelineId: pipeline.id, task });
          scheduledCount++;
          console.log(`   ✓ ${pipeline.name} - Schedule: ${pipeline.schedule}`);
        } catch (error) {
          console.error(
            `   ✗ Failed to schedule ${pipeline.name}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    console.log(
      `✅ Cron scheduler started with ${scheduledCount} scheduled pipelines\n`
    );
    return scheduledCount;
  } catch (error) {
    console.error('❌ Failed to start cron scheduler:', error);
    throw error;
  }
}

/**
 * Stop all cron jobs (typically called on shutdown)
 */
export function stopCronScheduler() {
  console.log('🛑 Stopping cron scheduler...');
  for (const [pipelineId, { task }] of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.clear();
  console.log(`✅ Stopped all cron jobs`);
}

/**
 * Reschedule a specific pipeline (useful when schedule is updated)
 */
export async function reschedulePipeline(pipelineId: string) {
  // Remove existing schedule if any
  const existing = scheduledTasks.get(pipelineId);
  if (existing) {
    existing.task.stop();
    scheduledTasks.delete(pipelineId);
  }

  // Fetch updated pipeline
  const pipeline = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, pipelineId))
    .limit(1);

  if (pipeline.length === 0 || !pipeline[0].schedule) {
    console.log(`Pipeline ${pipelineId} has no schedule or doesn't exist`);
    return;
  }

  const p = pipeline[0];

  if (!p.schedule || !cron.validate(p.schedule)) {
    console.error(`Invalid cron expression: ${p.schedule}`);
    return;
  }

  const task = cron.schedule(
    p.schedule,
    async () => {
      console.log(`⏰ Cron triggered: ${p.name} (${p.schedule})`);
      try {
        await publishPipelineRun(p.id, 'cron');
        console.log(`   ✓ Published to RabbitMQ`);
      } catch (error) {
        console.error(
          `   ✗ Failed to publish:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  );

  scheduledTasks.set(pipelineId, { pipelineId, task });
  console.log(`✓ Rescheduled ${p.name} - Schedule: ${p.schedule}`);
}

/**
 * Get all currently scheduled pipelines
 */
export function getScheduledPipelines() {
  return Array.from(scheduledTasks.values()).map((s) => s.pipelineId);
}

/**
 * Check if a cron expression is valid
 */
export function isValidCronExpression(expr: string): boolean {
  return cron.validate(expr);
}
