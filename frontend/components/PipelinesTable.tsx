"use client";

import { useEffect, useState } from "react";
import { getPipelines, getRuns, type JobRun, type Pipeline } from "@/lib/api";

type PipelinesTableProps = {
  refreshSignal: number;
};

export function PipelinesTable({ refreshSignal }: PipelinesTableProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [expandedPipelineIds, setExpandedPipelineIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [pipelineData, runData] = await Promise.all([
          getPipelines(),
          getRuns(),
        ]);
        setPipelines(pipelineData);
        setRuns(runData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load pipelines",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [refreshSignal]);

  function togglePipeline(pipelineId: string) {
    setExpandedPipelineIds((current) =>
      current.includes(pipelineId)
        ? current.filter((id) => id !== pipelineId)
        : [...current, pipelineId],
    );
  }

  function formatDateTime(value: string | null) {
    return value ? new Date(value).toLocaleString() : "-";
  }

  if (loading) {
    return <div className="loading">Loading pipelines and runs...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (pipelines.length === 0) {
    return (
      <div className="empty-state">
        <h2>No pipelines found</h2>
        <p>Create a pipeline to see it here.</p>
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th />
          <th>Name</th>
          <th>Dataset ID</th>
          <th>Description</th>
          <th>Schedule</th>
          <th>Active</th>
          <th>Created</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {pipelines.map((pipeline) => (
          <>
            <tr
              key={pipeline.id}
              className="expandable-row"
              onClick={() => togglePipeline(pipeline.id)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedPipelineIds.includes(pipeline.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  togglePipeline(pipeline.id);
                }
              }}
            >
              <td className="expand-indicator">
                <span
                  className={
                    expandedPipelineIds.includes(pipeline.id)
                      ? "expanded"
                      : "collapsed"
                  }
                >
                  ▸
                </span>
              </td>
              <td>
                <span className="badge badge-primary">{pipeline.name}</span>
              </td>
              <td className="mono">{pipeline.datasetId}</td>
              <td>{pipeline.description ?? "-"}</td>
              <td>{pipeline.schedule ?? "-"}</td>
              <td>{pipeline.active ? "Yes" : "No"}</td>
              <td>{new Date(pipeline.createdAt).toLocaleString()}</td>
              <td>{new Date(pipeline.updatedAt).toLocaleString()}</td>
            </tr>
            {expandedPipelineIds.includes(pipeline.id) ? (
              <tr className="expanded-content-row">
                <td colSpan={8}>
                  <div className="expanded-content">
                    <h2>Job Runs</h2>
                    {runs.filter((run) => run.pipelineId === pipeline.id)
                      .length === 0 ? (
                      <p className="expanded-empty">
                        No job runs found for this pipeline.
                      </p>
                    ) : (
                      <table className="nested-table">
                        <thead>
                          <tr>
                            <th>Run ID</th>
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
                          {runs
                            .filter((run) => run.pipelineId === pipeline.id)
                            .map((run) => (
                              <tr key={run.id}>
                                <td className="mono">{run.id}</td>
                                <td>{run.pipelineVersion}</td>
                                <td>
                                  <span className={`badge badge-${run.status}`}>
                                    {run.status}
                                  </span>
                                </td>
                                <td>{formatDateTime(run.startedAt)}</td>
                                <td>{formatDateTime(run.finishedAt)}</td>
                                <td>{run.recordsProcessed}</td>
                                <td>{run.errorMessage ?? "-"}</td>
                                <td>
                                  {new Date(run.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </td>
              </tr>
            ) : null}
          </>
        ))}
      </tbody>
    </table>
  );
}
