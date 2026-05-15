"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchableMultiSelectProps = {
  label: string;
  placeholder: string;
  options: SearchableOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
};

export function SearchableMultiSelect({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = String(query).trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, query]);

  function toggleValue(value: string) {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    );
  }

  function clearAll() {
    onChange([]);
  }

  const selectedCount = selectedValues.length;
  const triggerLabel =
    selectedCount === 0 ? placeholder : `${selectedCount} selected`;

  return (
    <div className="multi-select" ref={wrapperRef}>
      <div className="filter-label-row">
        <span className="filter-label">{label}</span>
        {selectedCount > 0 ? (
          <button type="button" className="filter-clear" onClick={clearAll}>
            Clear
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="multi-select-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>{triggerLabel}</span>
        <span className="multi-select-caret">▾</span>
      </button>

      {isOpen ? (
        <div className="multi-select-panel">
          <input
            className="multi-select-search"
            type="text"
            value={String(query)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
          />

          <div className="multi-select-list">
            {filteredOptions.length === 0 ? (
              <p className="multi-select-empty">No matches found.</p>
            ) : (
              filteredOptions.map((option) => (
                <label key={option.value} className="multi-select-option">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => toggleValue(option.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    {option.description ? (
                      <small>{option.description}</small>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
