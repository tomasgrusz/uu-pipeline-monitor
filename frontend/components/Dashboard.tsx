"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getPipelines,
  getRuns,
  getDatasets,
  getAlertEvents,
  getAlertRules,
  type Pipeline,
  type JobRun,
  type Dataset,
  type AlertEvent,
  type AlertRule,
} from "@/lib/api";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function SummaryCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <article className={`dashboard-card ${small ? "card-small" : ""}`}>
      <p className="card-label">{label}</p>
      <p className="card-value">{value}</p>
    </article>
  );
}

function Sparkline({
  values,
  color = "#3b82f6",
}: {
  values: number[];
  color?: string;
}) {
  if (!values || values.length === 0) return null;
  const w = 80;
  const h = 24;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1 || 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
    </svg>
  );
}

function StatusBars({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
  const colors: Record<string, string> = {
    success: "#059669",
    failed: "#dc2626",
    running: "#f59e0b",
    pending: "#6b7280",
  };
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Object.entries(counts).map(([k, v]) => (
        <div
          key={k}
          title={`${k}: ${v}`}
          style={{
            flex: `${v}`,
            height: 10,
            background: colors[k] ?? "#94a3b8",
            borderRadius: 4,
          }}
        />
      ))}
      <div className="small muted mono" style={{ marginLeft: 8 }}>
        {total} runs
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [p, r, d, ae, ar] = await Promise.all([
        getPipelines(),
        getRuns(),
        getDatasets(),
        getAlertEvents(),
        getAlertRules(),
      ]);

      setPipelines(p);
      setRuns(r);
      setDatasets(d);
      setAlertEvents(ae);
      setAlertRules(ar);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activePipelines = useMemo(
    () => pipelines.filter((p) => p.active).length,
    [pipelines],
  );
  const recentRuns = useMemo(
    () =>
      runs
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 12),
    [runs],
  );
  const recentAlerts = useMemo(
    () =>
      alertEvents
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 8),
    [alertEvents],
  );

  const successCount = useMemo(
    () => runs.filter((r) => r.status === "success").length,
    [runs],
  );
  const failedCount = useMemo(
    () => runs.filter((r) => r.status === "failed").length,
    [runs],
  );
  const runningCount = useMemo(
    () => runs.filter((r) => r.status === "running").length,
    [runs],
  );
  const pendingCount = useMemo(
    () => runs.filter((r) => r.status === "pending").length,
    [runs],
  );

  const avgDurationMs = useMemo(() => {
    const finished = runs
      .filter((r) => r.startedAt && r.finishedAt)
      .map(
        (r) =>
          new Date(r.finishedAt!).getTime() - new Date(r.startedAt!).getTime(),
      );
    if (finished.length === 0) return 0;
    return Math.round(finished.reduce((s, n) => s + n, 0) / finished.length);
  }, [runs]);

  const successRate = useMemo(() => {
    const total = runs.length || 1;
    return Math.round((successCount / total) * 100);
  }, [runs, successCount]);

  const datasetMap = useMemo(
    () => new Map(datasets.map((d) => [d.id, d.name])),
    [datasets],
  );

  const enabledRules = useMemo(
    () => alertRules.filter((r) => r.enabled).length,
    [alertRules],
  );
  const scheduledPipelines = useMemo(
    () => pipelines.filter((p) => !!p.schedule).length,
    [pipelines],
  );
  const lastRunAt = useMemo(() => {
    if (runs.length === 0) return null;
    return runs
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0].createdAt;
  }, [runs]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <section className="dashboard-hero">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>Pipeline operations at a glance</h1>
        <p className="hero-copy">
          Live metrics, recent runs, pipelines and alerts.
        </p>
      </div>

      <div className="dashboard-grid dashboard-grid-12">
        <SummaryCard label="Pipelines" value={pipelines.length} />
        <SummaryCard label="Active" value={activePipelines} />
        <SummaryCard label="Datasets" value={datasets.length} />
        <SummaryCard label="Alert rules" value={alertRules.length} />
        <SummaryCard label="Enabled rules" value={enabledRules} />
        <SummaryCard label="Scheduled pipelines" value={scheduledPipelines} />

        <SummaryCard label="Total runs" value={runs.length} />
        <SummaryCard label="Success rate" value={`${successRate}%`} />
        <SummaryCard label="Running" value={runningCount} />
        <SummaryCard label="Failed" value={failedCount} />
        <SummaryCard
          label="Avg run"
          value={`${Math.round(avgDurationMs / 1000)}s`}
        />
        <SummaryCard
          label="Last run"
          value={lastRunAt ? new Date(lastRunAt).toLocaleString() : "-"}
          small
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "1rem",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          <p className="small muted">Run status distribution</p>
          <StatusBars
            counts={{
              success: successCount,
              failed: failedCount,
              running: runningCount,
              pending: pendingCount,
            }}
          />
        </div>
        <div style={{ width: 200 }}>
          <p className="small muted">Recent durations</p>
          <Sparkline
            values={recentRuns.map((r) => {
              const s = r.startedAt ? new Date(r.startedAt).getTime() : 0;
              const f = r.finishedAt ? new Date(r.finishedAt).getTime() : s;
              return Math.max(0, f - s) / 1000;
            })}
            color="#7c3aed"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        <div>
          <div className="section-header">
            <h2>Recent runs</h2>
            <p className="small muted">Most recent job runs</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Pipeline</th>
                <th>Status</th>
                <th>Started</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id}>
                  <td className="mono">{run.id.slice(0, 8)}</td>
                  <td>{run.pipelineId}</td>
                  <td>
                    <span className={`badge badge-${run.status}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>{formatDate(run.startedAt)}</td>
                  <td>{formatDate(run.finishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside>
          <div className="section-header">
            <h2>Top pipelines</h2>
            <p className="small muted">Recently created</p>
          </div>
          <ul className="list-compact top-pipelines">
            {pipelines
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice(0, 8)
              .map((p) => (
                <li key={p.id} className="pipeline-item">
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#eef2ff",
                        display: "grid",
                        placeItems: "center",
                        color: "#4f46e5",
                        fontWeight: 700,
                      }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="pipeline-meta">
                      <div className="pipeline-name">{p.name}</div>
                      <div className="pipeline-sub">
                        {datasetMap.get(p.datasetId) ?? p.datasetId} •{" "}
                        {p.active ? "active" : "inactive"}
                      </div>
                    </div>
                  </div>
                  <div className="small mono muted">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
          </ul>

          <div style={{ marginTop: "1rem" }}>
            <div className="section-header">
              <h2>Recent alerts</h2>
            </div>
            <ul className="list-compact">
              {recentAlerts.map((a) => (
                <li key={a.id}>
                  <div>{a.message || a.id}</div>
                  <div className="small mono muted">
                    {formatDate(a.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
