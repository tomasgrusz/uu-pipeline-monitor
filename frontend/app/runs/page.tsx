"use client";

import { useEffect, useMemo, useState } from "react";
import { RunsTable } from "@/components/RunsTable";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import {
  SearchableMultiSelect,
  type SearchableOption,
} from "@/components/SearchableMultiSelect";
import {
  getDatasets,
  getPipelines,
  getRuns,
  type Dataset,
  type JobRun,
  type Pipeline,
} from "@/lib/api";

const REFRESH_INTERVAL_SECONDS = 30;
const STATUS_OPTIONS: Array<{ value: JobRun["status"]; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

export default function RunsPage() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    REFRESH_INTERVAL_SECONDS,
  );
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<JobRun["status"][]>(
    [],
  );
  const [isFetching, setIsFetching] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          setRefreshSignal((value) => value + 1);
          return REFRESH_INTERVAL_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsFetching(true);
        setError(null);
        const [runData, pipelineData, datasetData] = await Promise.all([
          getRuns(),
          getPipelines(),
          getDatasets(),
        ]);
        setRuns(runData);
        setPipelines(pipelineData);
        setDatasets(datasetData);
        setHasLoadedOnce(true);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load runs",
        );
      } finally {
        setIsFetching(false);
      }
    }

    fetchData();
  }, [refreshSignal]);

  function refreshNow() {
    setRefreshSignal((value) => value + 1);
    setSecondsRemaining(REFRESH_INTERVAL_SECONDS);
  }

  const pipelinesById = useMemo(
    () =>
      Object.fromEntries(pipelines.map((pipeline) => [pipeline.id, pipeline])),
    [pipelines],
  );

  const datasetsById = useMemo(
    () => Object.fromEntries(datasets.map((dataset) => [dataset.id, dataset])),
    [datasets],
  );

  const pipelineOptions = useMemo<SearchableOption[]>(
    () =>
      pipelines
        .map((pipeline) => ({
          value: pipeline.id,
          label: pipeline.name,
          description:
            datasetsById[pipeline.datasetId]?.name ?? pipeline.datasetId,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [datasetsById, pipelines],
  );

  const datasetOptions = useMemo<SearchableOption[]>(
    () =>
      datasets
        .map((dataset) => ({
          value: dataset.id,
          label: dataset.name,
          description: dataset.owner,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [datasets],
  );

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const pipeline = pipelinesById[run.pipelineId];
      const datasetId = pipeline?.datasetId;

      const pipelineMatches =
        selectedPipelineIds.length === 0 ||
        selectedPipelineIds.includes(run.pipelineId);
      const datasetMatches =
        selectedDatasetIds.length === 0 ||
        (datasetId ? selectedDatasetIds.includes(datasetId) : false);
      const statusMatches =
        selectedStatuses.length === 0 || selectedStatuses.includes(run.status);

      return pipelineMatches && datasetMatches && statusMatches;
    });
  }, [
    pipelinesById,
    runs,
    selectedDatasetIds,
    selectedPipelineIds,
    selectedStatuses,
  ]);

  const isInitialLoading = isFetching && !hasLoadedOnce;

  function toggleStatus(status: JobRun["status"]) {
    setSelectedStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  function clearStatusFilters() {
    setSelectedStatuses([]);
  }

  return (
    <>
      <h1>▶️ Job Runs</h1>
      <RefreshCountdown
        secondsRemaining={secondsRemaining}
        onRefresh={refreshNow}
      />

      <div className="filters-shell">
        <div className="filters-grid">
          <SearchableMultiSelect
            label="Pipeline"
            placeholder="All pipelines"
            options={pipelineOptions}
            selectedValues={selectedPipelineIds}
            onChange={setSelectedPipelineIds}
          />

          <SearchableMultiSelect
            label="Dataset"
            placeholder="All datasets"
            options={datasetOptions}
            selectedValues={selectedDatasetIds}
            onChange={setSelectedDatasetIds}
          />
        </div>

        <div className="status-filter-group">
          <div className="filter-label-row">
            <span className="filter-label">Status</span>
            {selectedStatuses.length > 0 ? (
              <button
                type="button"
                className="filter-clear"
                onClick={clearStatusFilters}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="status-pills">
            {STATUS_OPTIONS.map((status) => {
              const isActive = selectedStatuses.includes(status.value);

              return (
                <button
                  key={status.value}
                  type="button"
                  className={`status-pill ${isActive ? "status-pill-active" : ""}`}
                  onClick={() => toggleStatus(status.value)}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isInitialLoading ? (
        <div className="loading">Loading job runs...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : isFetching ? (
        <div className="refreshing-note">Refreshing data...</div>
      ) : null}

      {!isInitialLoading && !error ? (
        <RunsTable
          runs={filteredRuns}
          pipelinesById={pipelinesById}
          datasetsById={datasetsById}
        />
      ) : null}
    </>
  );
}
