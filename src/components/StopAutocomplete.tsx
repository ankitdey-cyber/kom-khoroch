import React, { useId, useMemo, useRef, useState } from 'react';
import type { Stop } from '../types';
import { MapPin } from './Icons';

interface StopAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stops: Stop[];
  placeholder?: string;
  variant: 'origin' | 'destination';
}

export const StopAutocomplete: React.FC<StopAutocompleteProps> = ({
  label,
  value,
  onChange,
  stops,
  placeholder,
  variant,
}) => {
  const inputId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const blurTimer = useRef<number | null>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const sorted = [...stops].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted.slice(0, 8);
    const starts = sorted.filter((s) => s.name.toLowerCase().startsWith(q));
    const includes = sorted.filter(
      (s) =>
        !s.name.toLowerCase().startsWith(q) &&
        (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    );
    return [...starts, ...includes].slice(0, 8);
  }, [stops, value]);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const isOrigin = variant === 'origin';

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

        <div className="flex min-w-0 flex-1 flex-col pr-8">
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
            aria-expanded={open && suggestions.length > 0}
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
              if (!open || suggestions.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((i) => Math.min(suggestions.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && highlightIndex >= 0) {
                e.preventDefault();
                handleSelect(suggestions[highlightIndex].name);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            className="min-h-[30px] w-full truncate bg-transparent text-base font-semibold text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-outline-variant/50 bg-surface-container-lowest py-1 shadow-[var(--shadow-md)]"
        >
          {suggestions.map((stop, idx) => {
            const highlighted = idx === highlightIndex;
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
