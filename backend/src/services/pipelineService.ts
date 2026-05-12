import { db } from '../db';
import { pipelines, pipelineVersions, jobRuns, alertRules, alertEvents } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Evaluates alert rules for a completed job run and creates alert events if conditions are met
 */
export async function evaluateAlertsForRun(runId: string): Promise<void> {
  // Get the run
  const run = await db.select().from(jobRuns).where(eq(jobRuns.id, runId)).limit(1);

  if (run.length === 0) {
    throw new Error(`Job run ${runId} not found`);
  }

  const jobRun = run[0];

  // Get all enabled alert rules for this pipeline
  const rules = await db
    .select()
    .from(alertRules)
    .where((table) => eq(table.pipelineId, jobRun.pipelineId));

  const enabledRules = rules.filter((rule) => rule.enabled);

  // Evaluate each rule
  for (const rule of enabledRules) {
    const shouldAlert = evaluateCondition(rule.condition, jobRun);

    if (shouldAlert) {
      // Create an alert event
      await db.insert(alertEvents).values({
        ruleId: rule.id,
        runId: jobRun.id,
        message: generateAlertMessage(rule.name, rule.condition, jobRun),
      });
    }
  }
}

/**
 * Evaluates a condition against a job run
 * Supports simple conditions like: "runtime > 10m", "status == failed", "recordsProcessed < 100"
 */
function evaluateCondition(condition: string, jobRun: any): boolean {
  try {
    // Calculate runtime in minutes
    const runtime = jobRun.finishedAt
      ? (jobRun.finishedAt.getTime() - jobRun.startedAt.getTime()) / (1000 * 60)
      : 0;

    // Replace condition variables with actual values
    let evaluableCondition = condition
      .replace(/runtime/g, runtime.toString())
      .replace(/status/g, `'${jobRun.status}'`)
      .replace(/recordsProcessed/g, jobRun.recordsProcessed.toString())
      .replace(/errorMessage/g, jobRun.errorMessage ? `'${jobRun.errorMessage}'` : 'null');

    // Safely evaluate the condition
    // NOTE: In production, use a proper expression parser library (e.g., expr-eval)
    return Boolean(new Function(`"use strict"; return (${evaluableCondition})`)());
  } catch (error) {
    console.error(`Failed to evaluate condition: ${condition}`, error);
    return false;
  }
}

/**
 * Generates a human-readable alert message
 */
function generateAlertMessage(ruleName: string, condition: string, jobRun: any): string {
  const runtime = jobRun.finishedAt
    ? Math.round((jobRun.finishedAt.getTime() - jobRun.startedAt.getTime()) / (1000 * 60))
    : 0;

  return `Alert: ${ruleName} - Condition "${condition}" triggered. Runtime: ${runtime}m, Status: ${jobRun.status}, Records: ${jobRun.recordsProcessed}`;
}