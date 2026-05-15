"use client";

import { type Dataset, type JobRun, type Pipeline } from "@/lib/api";

type RunsTableProps = {
  runs: JobRun[];
  pipelinesById: Record<string, Pipeline>;
  datasetsById: Record<string, Dataset>;
};

export function RunsTable({
  runs,
  pipelinesById,
  datasetsById,
}: RunsTableProps) {
  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <h2>No job runs match the selected filters</h2>
        <p>Try clearing one or more filters above.</p>
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Run ID</th>
          <th>Pipeline</th>
          <th>Dataset</th>
          <th>Version</th>
          <th>Status</th>
          <th>Started At</th>
          <th>Finished At</th>
          <th>Records Processed</th>
          <th>Error Message</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <td className="mono">{run.id}</td>
            <td>
              <div className="table-meta">
                <strong>
                  {pipelinesById[run.pipelineId]?.name ?? run.pipelineId}
                </strong>
                <span className="mono">{run.pipelineId}</span>
              </div>
            </td>
            <td className="mono">
              {datasetsById[pipelinesById[run.pipelineId]?.datasetId ?? ""]
                ?.name ??
                pipelinesById[run.pipelineId]?.datasetId ??
                "-"}
            </td>
            <td>{run.pipelineVersion}</td>
            <td>
              <span className={`badge badge-${run.status}`}>{run.status}</span>
            </td>
            <td>
              {run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}
            </td>
            <td>
              {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "-"}
            </td>
            <td>{run.recordsProcessed}</td>
            <td>{run.errorMessage ?? "-"}</td>
            <td>{new Date(run.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
