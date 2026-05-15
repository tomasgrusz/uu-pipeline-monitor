"use client";

import React, { useEffect, useState, Fragment } from "react";
import {
  getPipelines,
  getRuns,
  getDatasets,
  triggerPipeline,
  updatePipeline,
  deletePipeline,
  type JobRun,
  type Pipeline,
  type Dataset,
} from "@/lib/api";
import {
  SearchableMultiSelect,
  type SearchableOption,
} from "./SearchableMultiSelect";
import { CreatePipelineModal } from "./CreatePipelineModal";

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [pipelineData, runData, ds] = await Promise.all([
          getPipelines(),
          getRuns(),
          getDatasets(),
        ]);
        setPipelines(pipelineData);
        setRuns(runData);
        setDatasets(ds);
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

  async function reload() {
    setLoading(true);
    try {
      const [pipelineData, runData, ds] = await Promise.all([
        getPipelines(),
        getRuns(),
        getDatasets(),
      ]);
      setPipelines(pipelineData);
      setRuns(runData);
      setDatasets(ds);
    } catch (err) {
      console.error("Failed to reload pipelines", err);
    } finally {
      setLoading(false);
    }
  }

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
  let filteredPipelines = pipelines.filter((p) => {
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

  // sort by createdAt descending (most recent first)
  filteredPipelines = filteredPipelines
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div>
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Pipeline catalog</p>
          <h2>Manage pipelines, runs, and lifecycle actions</h2>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + New pipeline
        </button>
      </div>

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

      <CreatePipelineModal
        open={isCreateModalOpen}
        datasets={datasets}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={reload}
      />

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
            const pipelineRunsSorted = pipelineRuns.slice().sort((a, b) => {
              const aTime = a.finishedAt ?? a.startedAt ?? a.createdAt;
              const bTime = b.finishedAt ?? b.startedAt ?? b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
            const mostRecentRun = pipelineRunsSorted[0];

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
                  <td className="actions-cell">
                    <div className="actions">
                      <button
                        type="button"
                        title="Run pipeline"
                        className="icon-button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await triggerPipeline(pipeline.id);
                            await reload();
                          } catch (err) {
                            alert("Failed to trigger pipeline");
                          }
                        }}
                      >
                        {/* play icon */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        title={
                          pipeline.active
                            ? "Deactivate pipeline"
                            : "Activate pipeline"
                        }
                        className="icon-button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await updatePipeline(pipeline.id, {
                              active: !pipeline.active,
                            });
                            await reload();
                          } catch (err) {
                            alert("Failed to update pipeline");
                          }
                        }}
                      >
                        {/* switch icon */}
                        {pipeline.active ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M7 12a5 5 0 0 0 10 0 5 5 0 0 0-10 0z"
                              fill="currentColor"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M3 12a9 9 0 0 0 18 0 9 9 0 0 0-18 0z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          </svg>
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete pipeline"
                        className="icon-button dangerous"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = window.confirm(
                            `Delete pipeline ${pipeline.name}? Are you sure?`,
                          );
                          if (!ok) return;
                          try {
                            await deletePipeline(pipeline.id);
                            await reload();
                          } catch (err) {
                            alert("Failed to delete pipeline");
                          }
                        }}
                      >
                        {/* trash icon */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path
                            d="M3 6h18"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 11v6M14 11v6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
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
                              {pipelineRunsSorted.map((run) => (
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
