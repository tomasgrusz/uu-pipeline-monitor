"use client";

import React, { useEffect, useState, Fragment } from "react";
import {
  getPipelines,
  getRuns,
  getDatasets,
  type JobRun,
  type Pipeline,
  type Dataset,
} from "@/lib/api";
import {
  SearchableMultiSelect,
  type SearchableOption,
} from "./SearchableMultiSelect";

type PipelinesTableProps = {
  refreshSignal: number;
};

export function PipelinesTable({ refreshSignal }: PipelinesTableProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [expandedPipelineIds, setExpandedPipelineIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

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
        try {
          const ds = await getDatasets();
          setDatasets(ds);
        } catch (err) {
          console.error("Failed to load datasets", err);
        }
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

  // build dataset lookup
  const datasetMap = new Map<string, Dataset>();
  datasets.forEach((d) => datasetMap.set(d.id, d));

  // apply filters
  const filteredPipelines = pipelines.filter((p) => {
    if (
      selectedDatasetIds.length > 0 &&
      !selectedDatasetIds.includes(p.datasetId)
    ) {
      return false;
    }

    if (activeFilter === "active" && !p.active) return false;
    if (activeFilter === "inactive" && p.active) return false;

    return true;
  });

  return (
    <div>
      <div className="filters-row">
        <SearchableMultiSelect
          label="Dataset"
          placeholder="All datasets"
          options={
            datasets.map((d) => ({
              value: d.id,
              label: d.name,
            })) as SearchableOption[]
          }
          selectedValues={selectedDatasetIds}
          onChange={setSelectedDatasetIds}
        />

        <div className="active-filter">
          <span className="filter-label">Active</span>
          <div className="status-pills">
            <button
              type="button"
              className={`status-pill ${activeFilter === "all" ? "status-pill-active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`status-pill ${activeFilter === "active" ? "status-pill-active" : ""}`}
              onClick={() => setActiveFilter("active")}
            >
              Active
            </button>
            <button
              type="button"
              className={`status-pill ${activeFilter === "inactive" ? "status-pill-active" : ""}`}
              onClick={() => setActiveFilter("inactive")}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th />
            <th>Name</th>
            <th>Dataset</th>
            <th>Description</th>
            <th>Schedule</th>
            <th>Active</th>
            <th>Most Recent Run</th>
            <th>Recent Run Status</th>
            <th>Created</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {filteredPipelines.map((pipeline) => {
            const pipelineRuns = runs.filter(
              (run) => run.pipelineId === pipeline.id,
            );
            // pick most recent by finishedAt, then startedAt, then createdAt
            const mostRecentRun = pipelineRuns.slice().sort((a, b) => {
              const aTime = a.finishedAt ?? a.startedAt ?? a.createdAt;
              const bTime = b.finishedAt ?? b.startedAt ?? b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            })[0];

            return (
              <Fragment key={pipeline.id}>
                <tr
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
                  <td>
                    <div className="table-meta">
                      <strong>
                        {datasetMap.get(pipeline.datasetId)?.name ??
                          pipeline.datasetId}
                      </strong>
                      <small className="mono small">{pipeline.datasetId}</small>
                    </div>
                  </td>
                  <td>{pipeline.description ?? "-"}</td>
                  <td>{pipeline.schedule ?? "-"}</td>
                  <td>{pipeline.active ? "Yes" : "No"}</td>
                  <td>
                    {mostRecentRun
                      ? formatDateTime(
                          mostRecentRun.finishedAt ??
                            mostRecentRun.startedAt ??
                            mostRecentRun.createdAt,
                        )
                      : "-"}
                  </td>
                  <td>
                    {mostRecentRun ? (
                      <span className={`badge badge-${mostRecentRun.status}`}>
                        {mostRecentRun.status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{new Date(pipeline.createdAt).toLocaleString()}</td>
                  <td>{new Date(pipeline.updatedAt).toLocaleString()}</td>
                </tr>

                {expandedPipelineIds.includes(pipeline.id) ? (
                  <tr className="expanded-content-row">
                    <td colSpan={10}>
                      <div className="expanded-content">
                        <h2>Job Runs</h2>
                        {pipelineRuns.length === 0 ? (
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
                              {pipelineRuns.map((run) => (
                                <tr key={run.id}>
                                  <td className="mono">{run.id}</td>
                                  <td>{run.pipelineVersion}</td>
                                  <td>
                                    <span
                                      className={`badge badge-${run.status}`}
                                    >
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
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
