"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createDataset } from "@/lib/api";

type CreateDatasetModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

const SCHEMA_VERSION_OPTIONS = [1, 2, 3, 4, 5];

export function CreateDatasetModal({
  open,
  onClose,
  onCreated,
}: CreateDatasetModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [schemaVersion, setSchemaVersion] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setDescription("");
    setOwner("");
    setSchemaVersion("1");
    setError(null);
    setSubmitting(false);
  }, [open]);

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

    if (!name.trim() || !owner.trim()) {
      setError("Dataset name and owner are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await createDataset({
        name: name.trim(),
        description: description.trim() || undefined,
        owner: owner.trim(),
        schemaVersion: Number(schemaVersion),
      });

      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create dataset");
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
        aria-labelledby="create-dataset-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Datasets</p>
            <h2 id="create-dataset-title">Create new dataset</h2>
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
              <span>Name *</span>
              <input
                className="form-control"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer events"
                required
              />
            </label>

            <label className="field">
              <span>Owner *</span>
              <input
                className="form-control"
                type="text"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="Data platform"
                required
              />
            </label>

            <label className="field field-wide">
              <span>Description</span>
              <textarea
                className="form-control form-textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What kind of data does this dataset contain?"
                rows={4}
              />
            </label>

            <label className="field">
              <span>Schema version</span>
              <select
                className="form-control"
                value={schemaVersion}
                onChange={(event) => setSchemaVersion(event.target.value)}
              >
                {SCHEMA_VERSION_OPTIONS.map((version) => (
                  <option key={version} value={String(version)}>
                    Version {version}
                  </option>
                ))}
              </select>
              <small className="field-hint">
                Defaults to version 1 if you do not change it.
              </small>
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
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create dataset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
