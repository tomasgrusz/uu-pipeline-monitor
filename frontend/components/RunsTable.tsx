"use client";

import {
  type Dataset,
  type JobRun,
  type Pipeline,
  getRunById,
  type JobRunStep,
} from "@/lib/api";
import { useState } from "react";

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
  const [expandedRunIds, setExpandedRunIds] = useState<string[]>([]);
  const [runSteps, setRunSteps] = useState<Record<string, JobRunStep[]>>({});
  const [loadingRuns, setLoadingRuns] = useState<Record<string, boolean>>({});
  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <h2>No job runs match the selected filters</h2>
        <p>Try clearing one or more filters above.</p>
      </div>
    );
  }

  function toggleRun(runId: string) {
    setExpandedRunIds((current) =>
      current.includes(runId)
        ? current.filter((id) => id !== runId)
        : [...current, runId],
    );

    // if expanding and we don't have steps yet, fetch
    if (!runSteps[runId]) {
      fetchRunSteps(runId);
    }
  }

  async function fetchRunSteps(runId: string) {
    setLoadingRuns((s) => ({ ...s, [runId]: true }));
    try {
      const detail = await getRunById(runId);
      setRunSteps((s) => ({ ...s, [runId]: detail.steps }));
    } catch (err) {
      console.error("Failed to load run steps", err);
    } finally {
      setLoadingRuns((s) => ({ ...s, [runId]: false }));
    }
  }

  const sortedRuns = runs
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <table>
      <thead>
        <tr>
          <th />
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
        {sortedRuns.map((run) => (
          <>
            <tr
              key={run.id}
              className="expandable-row"
              onClick={() => toggleRun(run.id)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedRunIds.includes(run.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleRun(run.id);
                }
              }}
            >
              <td className="expand-indicator">
                <span
                  className={
                    expandedRunIds.includes(run.id) ? "expanded" : "collapsed"
                  }
                >
                  ▸
                </span>
              </td>
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
                <span className={`badge badge-${run.status}`}>
                  {run.status}
                </span>
              </td>
              <td>
                {run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}
              </td>
              <td>
                {run.finishedAt
                  ? new Date(run.finishedAt).toLocaleString()
                  : "-"}
              </td>
              <td>{run.recordsProcessed}</td>
              <td>{run.errorMessage ?? "-"}</td>
              <td>{new Date(run.createdAt).toLocaleString()}</td>
            </tr>

            {expandedRunIds.includes(run.id) ? (
              <tr className="expanded-content-row">
                <td colSpan={11}>
                  <div className="expanded-content">
                    <h3>Job Run Steps</h3>
                    {loadingRuns[run.id] ? (
                      <div className="loading">Loading steps...</div>
                    ) : runSteps[run.id] && runSteps[run.id].length > 0 ? (
                      <table className="nested-table">
                        <thead>
                          <tr>
                            <th>Step ID</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Started At</th>
                            <th>Finished At</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runSteps[run.id].map((step) => (
                            <tr key={step.id}>
                              <td className="mono">{step.id}</td>
                              <td>{step.name}</td>
                              <td>
                                <span className={`badge badge-${step.status}`}>
                                  {step.status}
                                </span>
                              </td>
                              <td>
                                {step.startedAt
                                  ? new Date(step.startedAt).toLocaleString()
                                  : "-"}
                              </td>
                              <td>
                                {step.finishedAt
                                  ? new Date(step.finishedAt).toLocaleString()
                                  : "-"}
                              </td>
                              <td>
                                {new Date(step.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="expanded-empty">
                        No steps found for this run.
                      </p>
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
