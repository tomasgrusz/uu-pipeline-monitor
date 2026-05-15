"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPipeline, type Dataset } from "@/lib/api";

type CreatePipelineModalProps = {
  open: boolean;
  datasets: Dataset[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

export function CreatePipelineModal({
  open,
  datasets,
  onClose,
  onCreated,
}: CreatePipelineModalProps) {
  const [datasetId, setDatasetId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDatasetId((current) => current || datasets[0]?.id || "");
    setName("");
    setDescription("");
    setSchedule("");
    setActive(true);
    setError(null);
    setSubmitting(false);
  }, [datasets, open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!datasetId || !name.trim()) {
      setError("Dataset and pipeline name are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await createPipeline({
        datasetId,
        name: name.trim(),
        description: description.trim() || undefined,
        schedule: schedule.trim() || undefined,
        active,
      });

      await onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create pipeline",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel modal-panel-large"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-pipeline-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Pipelines</p>
            <h2 id="create-pipeline-title">Create new pipeline</h2>
          </div>
          <button
            type="button"
            className="icon-button modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <label className="field">
              <span>Dataset *</span>
              <select
                className="form-control"
                value={datasetId}
                onChange={(event) => setDatasetId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select a dataset
                </option>
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Name *</span>
              <input
                className="form-control"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Daily quality check"
                required
              />
            </label>

            <label className="field field-wide">
              <span>Description</span>
              <textarea
                className="form-control form-textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does this pipeline validate?"
                rows={4}
              />
            </label>

            <label className="field">
              <span>Schedule</span>
              <input
                className="form-control"
                type="text"
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
                placeholder="0 9 * * *"
              />
              <small className="field-hint">
                Cron expression. Leave blank for manual runs only.
              </small>
            </label>

            <label className="field field-checkbox">
              <span>Active</span>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                <span>Enable pipeline after creation</span>
              </label>
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={submitting || datasets.length === 0}
            >
              {submitting ? "Creating..." : "Create pipeline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
