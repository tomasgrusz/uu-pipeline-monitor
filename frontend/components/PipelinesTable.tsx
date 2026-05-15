"use client";

import { useEffect, useState } from "react";
import { getPipelines, type Pipeline } from "@/lib/api";

export function PipelinesTable() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPipelines() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPipelines();
        setPipelines(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load pipelines",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPipelines();
  }, []);

  if (loading) {
    return <div className="loading">Loading pipelines...</div>;
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
          <tr key={pipeline.id}>
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
        ))}
      </tbody>
    </table>
  );
}
