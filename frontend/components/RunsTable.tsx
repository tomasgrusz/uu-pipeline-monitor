"use client";

import { useEffect, useState } from "react";
import { getRuns, type JobRun } from "@/lib/api";

export function RunsTable() {
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRuns() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRuns();
        setRuns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load runs");
      } finally {
        setLoading(false);
      }
    }

    fetchRuns();
  }, []);

  if (loading) {
    return <div className="loading">Loading job runs...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <h2>No job runs found</h2>
        <p>Trigger a pipeline to create its first job run.</p>
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Run ID</th>
          <th>Pipeline ID</th>
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
            <td className="mono">{run.pipelineId}</td>
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
