// Retrieve datasetId for a given pipelineId
import { db } from '../db';
import { pipelines, pipelineVersions } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Helper function to get datasetId for a given pipelineId
 */
export async function getDatasetIdForPipeline(pipelineId: string): Promise<string> {
  const pipelineData = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, pipelineId))
    .limit(1);

  if (pipelineData.length === 0) {
    throw new Error(`Pipeline not found: ${pipelineId}`);
  }

  return pipelineData[0].datasetId;
}

/**
 * Get pipeline's laterst version number
 */
export async function getLatestPipelineVersion(pipelineId: string): Promise<number> {
  const latestVersion = await db
    .select()
    .from(pipelineVersions)
    .where(eq(pipelineVersions.pipelineId, pipelineId))
    .orderBy(desc(pipelineVersions.version))
    .limit(1);

  if (latestVersion.length === 0) {
    throw new Error(`No pipeline versions found for pipeline ${pipelineId}`);
  }

  return latestVersion[0].version;
}