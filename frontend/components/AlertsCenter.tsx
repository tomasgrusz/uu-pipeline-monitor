"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAlertEvents,
  getAlertRules,
  getDatasets,
  getPipelines,
  type AlertEvent,
  type AlertRule,
  type Dataset,
  type Pipeline,
} from "@/lib/api";
import {
  SearchableMultiSelect,
  type SearchableOption,
} from "./SearchableMultiSelect";
import { CreateAlertRuleModal } from "./CreateAlertRuleModal";

type ViewMode = "alerts" | "rules";

type AlertEventContext = {
  event: AlertEvent;
  rule?: AlertRule;
  pipeline?: Pipeline;
  dataset?: Dataset;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatEntityLabel(name?: string, id?: string) {
  if (!name && !id) {
    return "-";
  }

  if (!name) {
    return id ?? "-";
  }

  return id ? `${name}` : name;
}

export function AlertsCenter() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("alerts");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>([]);
  const [isCreateRuleModalOpen, setIsCreateRuleModalOpen] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [alertData, ruleData, pipelineData, datasetData] =
        await Promise.all([
          getAlertEvents(),
          getAlertRules(),
          getPipelines(),
          getDatasets(),
        ]);

      setAlerts(alertData);
      setRules(ruleData);
      setPipelines(pipelineData);
      setDatasets(datasetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const datasetMap = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset] as const)),
    [datasets],
  );

  const pipelineMap = useMemo(
    () =>
      new Map(pipelines.map((pipeline) => [pipeline.id, pipeline] as const)),
    [pipelines],
  );

  const ruleMap = useMemo(
    () => new Map(rules.map((rule) => [rule.id, rule] as const)),
    [rules],
  );

  const alertRows = useMemo<AlertEventContext[]>(() => {
    return alerts.map((event) => {
      const rule = ruleMap.get(event.ruleId);
      const pipeline = rule ? pipelineMap.get(rule.pipelineId) : undefined;
      const dataset = pipeline ? datasetMap.get(pipeline.datasetId) : undefined;

      return { event, rule, pipeline, dataset };
    });
  }, [alerts, datasetMap, pipelineMap, ruleMap]);

  const filteredAlertRows = useMemo(() => {
    return alertRows
      .filter((row) => {
        if (
          selectedDatasetIds.length > 0 &&
          (!row.dataset || !selectedDatasetIds.includes(row.dataset.id))
        ) {
          return false;
        }

        if (
          selectedPipelineIds.length > 0 &&
          (!row.pipeline || !selectedPipelineIds.includes(row.pipeline.id))
        ) {
          return false;
        }

        return true;
      })
      .slice()
      .sort(
        (a, b) =>
          new Date(b.event.createdAt).getTime() -
          new Date(a.event.createdAt).getTime(),
      );
  }, [alertRows, selectedDatasetIds, selectedPipelineIds]);

  const sortedRules = useMemo(() => {
    return rules
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [rules]);

  const datasetOptions = useMemo<SearchableOption[]>(
    () =>
      datasets.map((dataset) => ({
        value: dataset.id,
        label: dataset.name,
      })),
    [datasets],
  );

  const pipelineOptions = useMemo<SearchableOption[]>(
    () =>
      pipelines.map((pipeline) => ({
        value: pipeline.id,
        label: pipeline.name,
      })),
    [pipelines],
  );

  const enabledRuleCount = rules.filter((rule) => rule.enabled).length;

  if (loading) {
    return <div className="loading">Loading alerts and rules...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <section className="dashboard-hero">
      <div>
        <p className="eyebrow">Alerts</p>
        <h1>Alert center</h1>
        <p className="hero-copy">
          Review triggered alerts, filter them by dataset or pipeline, and
          manage the alert rules that generate them.
        </p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <p className="card-label">Triggered alerts</p>
          <p className="card-value">{alerts.length}</p>
        </article>
        <article className="dashboard-card">
          <p className="card-label">Alert rules</p>
          <p className="card-value">{rules.length}</p>
        </article>
        <article className="dashboard-card">
          <p className="card-label">Enabled rules</p>
          <p className="card-value">{enabledRuleCount}</p>
        </article>
      </div>

      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Alert management</p>
          <h2>{viewMode === "alerts" ? "Triggered alerts" : "Alert rules"}</h2>
        </div>
        <div className="status-pills">
          <button
            type="button"
            className={`status-pill ${viewMode === "alerts" ? "status-pill-active" : ""}`}
            onClick={() => setViewMode("alerts")}
          >
            Triggered alerts
          </button>
          <button
            type="button"
            className={`status-pill ${viewMode === "rules" ? "status-pill-active" : ""}`}
            onClick={() => setViewMode("rules")}
          >
            Alert rules
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsCreateRuleModalOpen(true)}
          >
            + New rule
          </button>
        </div>
      </div>

      <div className="filters-row">
        <SearchableMultiSelect
          label="Dataset"
          placeholder="All datasets"
          options={datasetOptions}
          selectedValues={selectedDatasetIds}
          onChange={setSelectedDatasetIds}
        />

        <SearchableMultiSelect
          label="Pipeline"
          placeholder="All pipelines"
          options={pipelineOptions}
          selectedValues={selectedPipelineIds}
          onChange={setSelectedPipelineIds}
        />
      </div>

      <CreateAlertRuleModal
        open={isCreateRuleModalOpen}
        pipelines={pipelines}
        onClose={() => setIsCreateRuleModalOpen(false)}
        onCreated={loadData}
      />

      {viewMode === "alerts" ? (
        <div>
          <table>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Rule</th>
                <th>Condition</th>
                <th>Dataset</th>
                <th>Pipeline</th>
                <th>Run</th>
                <th>Message</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlertRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div
                      className="empty-state"
                      style={{ padding: "2rem 1rem" }}
                    >
                      <h2>No triggered alerts found</h2>
                      <p>Try adjusting the dataset or pipeline filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlertRows.map(({ event, rule, pipeline, dataset }) => (
                  <tr key={event.id}>
                    <td>
                      <span className="badge badge-primary">Alert</span>
                    </td>
                    <td>
                      <div className="table-meta">
                        <strong>{rule?.name ?? event.ruleId}</strong>
                        <small className="mono small">{event.ruleId}</small>
                      </div>
                    </td>
                    <td>{rule?.condition ?? "-"}</td>
                    <td>
                      <div className="table-meta">
                        <strong>{dataset?.name ?? "-"}</strong>
                        <small className="mono small">
                          {dataset?.id ?? "-"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="table-meta">
                        <strong>{pipeline?.name ?? "-"}</strong>
                        <small className="mono small">
                          {pipeline?.id ?? "-"}
                        </small>
                      </div>
                    </td>
                    <td className="mono">{event.runId}</td>
                    <td>{event.message}</td>
                    <td>{formatDateTime(event.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Pipeline</th>
                <th>Dataset</th>
                <th>Condition</th>
                <th>Enabled</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedRules.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div
                      className="empty-state"
                      style={{ padding: "2rem 1rem" }}
                    >
                      <h2>No alert rules yet</h2>
                      <p>
                        Use the new rule button to define your first alert rule.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRules.map((rule) => {
                  const pipeline = pipelineMap.get(rule.pipelineId);
                  const dataset = pipeline
                    ? datasetMap.get(pipeline.datasetId)
                    : undefined;

                  return (
                    <tr key={rule.id}>
                      <td>
                        <span className="badge badge-primary">{rule.name}</span>
                      </td>
                      <td>
                        <div className="table-meta">
                          <strong>
                            {formatEntityLabel(pipeline?.name, pipeline?.id)}
                          </strong>
                          <small className="mono small">
                            {rule.pipelineId}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="table-meta">
                          <strong>{dataset?.name ?? "-"}</strong>
                          <small className="mono small">
                            {dataset?.id ?? "-"}
                          </small>
                        </div>
                      </td>
                      <td>{rule.condition}</td>
                      <td>
                        <span
                          className={`badge badge-${rule.enabled ? "success" : "failed"}`}
                        >
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td>{formatDateTime(rule.createdAt)}</td>
                      <td>{formatDateTime(rule.updatedAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
