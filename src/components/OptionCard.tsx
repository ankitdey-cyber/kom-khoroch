import React from 'react';
import type { CabReference, RouteOption } from '../types';
import {
  formatKm,
  formatRupee,
  getLegColor,
  getModeSummary,
} from '../utils/transit';
import { ArrowRightIcon } from './Icons';

interface OptionCardProps {
  option: RouteOption;
  selected: boolean;
  cab: CabReference | null;
  budgetAmount: number | null;
  onSelect: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  option,
  selected,
  cab,
  budgetAmount,
  onSelect,
}) => {
  const isOverBudget =
    budgetAmount !== null && option.totalFare > budgetAmount;
  const cabSavings = cab ? cab.fare - option.totalFare : 0;
  const totalLegMinutes = Math.max(
    1,
    option.legs.reduce((sum, l) => sum + l.minutes, 0)
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full rounded-[12px] border bg-surface p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
        selected
          ? 'border-ink ring-2 ring-accent'
          : 'border-rule hover:border-ink/50'
      }`}
    >
      {/* Top row: option label + savings/budget pill */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected && (
            <span className="rounded bg-accent px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wide text-[#141B2D]">
              Selected
            </span>
          )}
          <span className="font-display text-xs font-bold tracking-wide text-muted">
            {option.labels.join(' · ')}
          </span>
        </div>

        {isOverBudget ? (
          <span className="rounded-full bg-bad/15 px-2.5 py-0.5 text-xs font-semibold text-bad tabular-nums">
            {formatRupee(option.totalFare - (budgetAmount ?? 0))} over budget
          </span>
        ) : cab && cabSavings >= 20 ? (
          <span className="rounded-full bg-good/15 px-2.5 py-0.5 text-xs font-semibold text-good tabular-nums">
            {formatRupee(cabSavings)} less than a cab
          </span>
        ) : null}
      </div>

      {/* Price + core metrics */}
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-display text-[28px] font-extrabold leading-none text-ink tabular-nums">
          {formatRupee(option.totalFare)}
        </span>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted tabular-nums">
          <span>
            <strong className="font-semibold text-ink">
              {option.totalMinutes}
            </strong>{' '}
            min
          </span>
          <span>
            <strong className="font-semibold text-ink">{option.rides}</strong>{' '}
            {option.rides === 1 ? 'ride' : 'rides'}
          </span>
          <span>
            <strong className="font-semibold text-ink">
              {formatKm(option.walkKm)}
            </strong>{' '}
            walk
          </span>
        </div>
      </div>

      {/* 10px mode strip split proportionally by leg minutes */}
      <div
        className="mt-3 flex h-[10px] w-full gap-0.5 overflow-hidden rounded-[5px]"
        aria-hidden="true"
      >
        {option.legs.map((leg, i) => {
          const share = Math.max(0.04, leg.minutes / totalLegMinutes);
          const isWalk = leg.mode === 'walk';
          return (
            <span
              key={`${leg.from}-${leg.to}-${i}`}
              style={{
                flex: share,
                background: isWalk
                  ? 'repeating-linear-gradient(90deg, var(--c-walk) 0 4px, transparent 4px 7px)'
                  : getLegColor(leg),
              }}
              className="block h-full"
            />
          );
        })}
      </div>

      {/* Mode chain + view steps cue */}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate font-medium">{getModeSummary(option)}</span>
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-display font-bold text-ink group-hover:underline">
          <span>View steps</span>
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
};
