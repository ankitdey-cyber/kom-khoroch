import React, { useId, useMemo, useRef, useState } from 'react';
import type { Stop } from '../types';

interface StopAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stops: Stop[];
  placeholder?: string;
  markerText: string;
  markerColor: string;
}

export const StopAutocomplete: React.FC<StopAutocompleteProps> = ({
  label,
  value,
  onChange,
  stops,
  placeholder,
  markerText,
  markerColor,
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

  return (
    <div className="relative min-w-0">
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs font-medium text-muted"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        <span
          className="pointer-events-none absolute left-2.5 grid h-5 w-5 place-items-center rounded text-[10px] font-display font-extrabold text-white"
          style={{ backgroundColor: markerColor }}
          aria-hidden="true"
        >
          {markerText}
        </span>
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
          className="min-h-[44px] w-full rounded-[8px] border border-rule bg-bg py-2 pl-9 pr-3 text-sm font-medium text-ink placeholder:text-muted/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-[8px] border border-rule bg-surface py-1 shadow-lg"
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
                className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                  highlighted ? 'bg-bg text-ink' : 'text-ink hover:bg-bg'
                }`}
              >
                <span className="truncate font-medium">{stop.name}</span>
                <span className="shrink-0 font-display text-[11px] font-bold text-muted tabular-nums">
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
