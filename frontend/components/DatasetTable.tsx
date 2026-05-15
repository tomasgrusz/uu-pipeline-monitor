"use client";

import { useEffect, useState } from "react";
import { getDatasets, type Dataset } from "@/lib/api";

type DatasetTableProps = {
  refreshSignal: number;
};

export function DatasetTable({ refreshSignal }: DatasetTableProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatasets() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDatasets();
        setDatasets(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load datasets",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDatasets();
  }, [refreshSignal]);

  if (loading) {
    return <div className="loading">Loading datasets...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (datasets.length === 0) {
    return (
      <div className="empty-state">
        <h2>No datasets found</h2>
        <p>Start by creating your first dataset</p>
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Owner</th>
          <th>Schema Version</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {datasets.map((dataset) => (
          <tr key={dataset.id}>
            <td>
              <span className="badge badge-primary">{dataset.name}</span>
            </td>
            <td>{dataset.description}</td>
            <td>{dataset.owner}</td>
            <td>{dataset.schemaVersion}</td>
            <td>{new Date(dataset.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
