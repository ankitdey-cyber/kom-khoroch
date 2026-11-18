import React, { useId, useMemo, useRef, useState } from 'react';
import type { Stop } from '../types';
import { Crosshair, MapPin } from './Icons';

interface StopAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stops: Stop[];
  placeholder?: string;
  variant: 'origin' | 'destination';
  onUseMyLocation?: () => void;
  isLocating?: boolean;
  locationError?: string | null;
}

export const StopAutocomplete: React.FC<StopAutocompleteProps> = ({
  label,
  value,
  onChange,
  stops,
  placeholder,
  variant,
  onUseMyLocation,
  isLocating = false,
  locationError = null,
}) => {
  const inputId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const blurTimer = useRef<number | null>(null);

  const isOrigin = variant === 'origin';
  const showUseLocationRow = isOrigin && Boolean(onUseMyLocation);

  const suggestions = useMemo(() => {
    const trimmed = value.trim();
    const q = trimmed.toLowerCase();
    const sorted = [...stops].sort((a, b) => a.name.localeCompare(b.name));
    if (
      !q ||
      trimmed === 'Finding you...' ||
      trimmed.startsWith('My location (')
    ) {
      return sorted.slice(0, 8);
    }
    const starts = sorted.filter((s) => s.name.toLowerCase().startsWith(q));
    const includes = sorted.filter(
      (s) =>
        !s.name.toLowerCase().startsWith(q) &&
        (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    );
    return [...starts, ...includes].slice(0, 8);
  }, [stops, value]);

  const totalItems = (showUseLocationRow ? 1 : 0) + suggestions.length;

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleTriggerLocation = () => {
    setOpen(false);
    setHighlightIndex(-1);
    onUseMyLocation?.();
  };

  return (
    <div className="relative min-w-0">
      <div
        className={`flex items-center rounded-xl bg-surface-container-low px-3.5 py-2.5 transition-all focus-within:ring-2 ${
          isOrigin
            ? 'focus-within:ring-secondary/30'
            : 'focus-within:ring-primary/30'
        }`}
      >
        <div
          className={`mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isOrigin
              ? 'bg-secondary-container text-secondary'
              : 'bg-primary-fixed text-primary'
          }`}
          aria-hidden="true"
        >
          {isOrigin ? (
            <span className="h-3 w-3 rounded-full border-[3px] border-current" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>

        <div
          className={`flex min-w-0 flex-1 flex-col ${
            showUseLocationRow ? 'pr-2' : 'pr-11'
          }`}
        >
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold tracking-wide text-on-surface-variant"
          >
            {label}
          </label>
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open && totalItems > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={value}
            placeholder={placeholder}
            onFocus={() => {
              if (blurTimer.current) window.clearTimeout(blurTimer.current);
              setOpen(true);
            }}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 140);
            }}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
              setHighlightIndex(-1);
            }}
            onKeyDown={(e) => {
              if (!open || totalItems === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((i) => Math.min(totalItems - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && highlightIndex >= 0) {
                e.preventDefault();
                if (showUseLocationRow && highlightIndex === 0) {
                  handleTriggerLocation();
                } else {
                  const stopIdx = showUseLocationRow
                    ? highlightIndex - 1
                    : highlightIndex;
                  const target = suggestions[stopIdx];
                  if (target) handleSelect(target.name);
                }
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            className="min-h-[44px] w-full truncate rounded-md bg-transparent text-base font-semibold text-on-surface placeholder:text-on-surface-variant/75"
          />
        </div>

        {showUseLocationRow && (
          <button
            type="button"
            onClick={handleTriggerLocation}
            disabled={isLocating}
            aria-label="Use my location"
            title="Use my location"
            className="mr-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary transition-colors hover:bg-primary-fixed disabled:opacity-60"
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {locationError && (
        <p
          role="status"
          aria-live="polite"
          className="mt-1.5 px-1 text-xs font-semibold text-error"
        >
          {locationError}
        </p>
      )}

      {open && totalItems > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-1 shadow-[var(--shadow-md)]"
        >
          {showUseLocationRow && (
            <li
              role="option"
              aria-selected={highlightIndex === 0}
              onMouseDown={(e) => {
                e.preventDefault();
                handleTriggerLocation();
              }}
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 border-b border-outline-variant/30 px-3.5 py-2 text-sm transition-colors ${
                highlightIndex === 0
                  ? 'bg-primary-fixed/50 text-primary'
                  : 'text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="flex items-center gap-2 font-bold">
                <Crosshair className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{isLocating ? 'Finding you...' : 'Use my location'}</span>
              </span>
              <span className="shrink-0 rounded bg-primary-fixed px-1.5 py-0.5 text-[11px] font-bold text-primary">
                GPS
              </span>
            </li>
          )}

          {suggestions.map((stop, idx) => {
            const itemIndex = showUseLocationRow ? idx + 1 : idx;
            const highlighted = itemIndex === highlightIndex;
            return (
              <li
                key={stop.id}
                role="option"
                aria-selected={highlighted}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(stop.name);
                }}
                className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm transition-colors ${
                  highlighted
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span className="truncate font-semibold">{stop.name}</span>
                <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 text-[11px] font-bold text-on-surface-variant tabular-nums">
                  {stop.id}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
