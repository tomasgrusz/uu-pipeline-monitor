"use client";

import { useEffect, useState } from "react";
import { getDatasets, type Dataset } from "@/lib/api";
import { CreateDatasetModal } from "./CreateDatasetModal";

type DatasetTableProps = {
  refreshSignal: number;
};

export function DatasetTable({ refreshSignal }: DatasetTableProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  async function reloadDatasets() {
    try {
      setLoading(true);
      const data = await getDatasets();
      setDatasets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchDatasets() {
      try {
        setLoading(true);
        setError(null);
        await reloadDatasets();
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
    <div>
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">Dataset catalog</p>
          <h2>Create and manage datasets</h2>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + New dataset
        </button>
      </div>

      <CreateDatasetModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={reloadDatasets}
      />

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
    </div>
  );
}
