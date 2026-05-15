"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createAlertRule, type Pipeline } from "@/lib/api";

type CreateAlertRuleModalProps = {
  open: boolean;
  pipelines: Pipeline[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

export function CreateAlertRuleModal({
  open,
  pipelines,
  onClose,
  onCreated,
}: CreateAlertRuleModalProps) {
  const [pipelineId, setPipelineId] = useState("");
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPipelineId(pipelines[0]?.id ?? "");
    setName("");
    setCondition("");
    setEnabled(true);
    setError(null);
    setSubmitting(false);
  }, [open, pipelines]);

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

    if (!pipelineId || !name.trim() || !condition.trim()) {
      setError("Pipeline, name, and condition are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await createAlertRule({
        pipelineId,
        name: name.trim(),
        condition: condition.trim(),
        enabled,
      });

      await onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create alert rule",
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
        aria-labelledby="create-alert-rule-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Alerts</p>
            <h2 id="create-alert-rule-title">Create new alert rule</h2>
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
              <span>Pipeline *</span>
              <select
                className="form-control"
                value={pipelineId}
                onChange={(event) => setPipelineId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select a pipeline
                </option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name} ({pipeline.id})
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
                placeholder="High failure rate"
                required
              />
            </label>

            <label className="field field-wide">
              <span>Condition *</span>
              <textarea
                className="form-control form-textarea"
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                placeholder="status = failed for 3 consecutive runs"
                rows={5}
                required
              />
              <small className="field-hint">
                Describe the rule logic or threshold that should trigger an
                alert.
              </small>
            </label>

            <label className="field field-checkbox">
              <span>Enabled</span>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                <span>Activate the rule after creation</span>
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
              disabled={submitting || pipelines.length === 0}
            >
              {submitting ? "Creating..." : "Create rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
