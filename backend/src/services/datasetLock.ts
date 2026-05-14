/**
 * Dataset Lock Manager
 * Manages concurrent pipeline execution by preventing multiple pipelines
 * from running on the same dataset simultaneously.
 *
 * Pipelines with different datasets can run in parallel.
 */

interface DatasetLock {
  datasetId: string;
  pipelineIds: Set<string>;
  acquiredAt: Date;
}

const datasetLocks = new Map<string, DatasetLock>();

/**
 * Check if a dataset is currently being processed
 */
export function isDatasetLocked(datasetId: string): boolean {
  return datasetLocks.has(datasetId);
}

/**
 * Get all currently locked datasets
 */
export function getLockedDatasets(): string[] {
  return Array.from(datasetLocks.keys());
}

/**
 * Acquire a lock for a dataset
 * Returns true if lock was acquired, false if dataset is already locked
 */
export function acquireDatasetLock(datasetId: string, pipelineId: string): boolean {
  if (datasetLocks.has(datasetId)) {
    const lock = datasetLocks.get(datasetId)!;
    lock.pipelineIds.add(pipelineId);
    return false; // Already locked
  }

  datasetLocks.set(datasetId, {
    datasetId,
    pipelineIds: new Set([pipelineId]),
    acquiredAt: new Date(),
  });

  return true; // Lock acquired
}

/**
 * Release a lock for a dataset/pipeline combination
 */
export function releaseDatasetLock(datasetId: string, pipelineId: string): void {
  const lock = datasetLocks.get(datasetId);
  if (!lock) return;

  lock.pipelineIds.delete(pipelineId);

  // Remove lock if no more pipelines are waiting
  if (lock.pipelineIds.size === 0) {
    datasetLocks.delete(datasetId);
    console.log(`🔓 Released lock for dataset: ${datasetId}`);
  }
}

/**
 * Get wait time in ms for a dataset (based on how long it's been locked)
 */
export function getDatasetWaitTime(datasetId: string): number {
  const lock = datasetLocks.get(datasetId);
  if (!lock) return 0;

  // Return time elapsed since lock was acquired
  return Date.now() - lock.acquiredAt.getTime();
}

/**
 * Clear all locks (use on shutdown)
 */
export function clearAllLocks(): void {
  datasetLocks.clear();
  console.log('🔓 Cleared all dataset locks');
}
