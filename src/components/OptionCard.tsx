import React from 'react';
import type { CabReference, LangKey, RouteOption } from '../types';
import {
  describeLeg,
  formatKm,
  formatRupee,
  getLegColor,
  network,
} from '../utils/transit';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  ModeIcon,
  Navigation,
  Zap,
} from './Icons';

interface OptionCardProps {
  option: RouteOption;
  selected: boolean;
  isSaved: boolean;
  cab: CabReference | null;
  budgetAmount: number | null;
  onSelect: () => void;
  onSaveOption: (option: RouteOption) => void;
  lang: LangKey;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  option,
  selected,
  isSaved,
  cab,
  budgetAmount,
  onSelect,
  onSaveOption,
  lang,
}) => {
  const isOverBudget =
    budgetAmount !== null && option.totalFare > budgetAmount;
  const cabSavings = cab ? cab.fare - option.totalFare : 0;
  const totalLegMinutes = Math.max(
    1,
    option.legs.reduce((sum, l) => sum + l.minutes, 0)
  );

  const isSmartPick = option.labels.includes('Smart pick');
  const isCheapest = option.labels.includes('Cheapest');
  const isFastest = option.labels.includes('Fastest');

  const badgeStyle = isCheapest
    ? 'bg-secondary text-on-secondary'
    : isSmartPick
      ? 'bg-primary-container text-on-primary-container'
      : 'bg-tertiary-container text-on-tertiary-container';

  const rideLegs = option.legs.filter((l) => l.mode !== 'walk');
  const displayLegs = option.legs.filter(
    (l) => l.mode !== 'walk' || l.from === 'ME'
  );
  const walkLegs = option.legs.filter((l) => l.mode === 'walk');

  const fareBreakdownText = rideLegs
    .map((l) => `${network.modes[l.mode].label} ${formatRupee(l.fare)}`)
    .join(' + ');

  return (
    <article
      className={`relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] sm:p-6 ${
        selected || isSmartPick ? 'ring-2 ring-primary/35' : ''
      }`}
    >
      {/* Badge Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${badgeStyle}`}
          >
            {isFastest && !isCheapest ? (
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{option.labels.join(' · ').toUpperCase()}</span>
          </span>

          {isOverBudget ? (
            <span className="rounded-full bg-error-container px-2.5 py-1 text-[11px] font-bold text-error tabular-nums">
              {formatRupee(option.totalFare - (budgetAmount ?? 0))} over budget
            </span>
          ) : cab && cabSavings > 0 ? (
            <span className="rounded-full bg-secondary-container/60 px-2.5 py-1 text-[11px] font-semibold text-on-secondary-fixed-variant tabular-nums">
              {formatRupee(cabSavings)} less than a cab
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onSaveOption(option)}
          aria-label={isSaved ? 'Remove from saved commutes' : 'Save route'}
          title={isSaved ? 'Saved' : 'Save Route'}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            isSaved
              ? 'bg-secondary-container/50 text-secondary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
          }`}
        >
          <Bookmark
            className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Main Metrics Row */}
      <div className="flex flex-col justify-between gap-4 pb-4 sm:flex-row sm:items-baseline">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-display text-3xl font-extrabold tabular-nums sm:text-4xl ${
                isCheapest ? 'text-secondary' : isSmartPick ? 'text-primary' : 'text-on-surface'
              }`}
            >
              {formatRupee(option.totalFare)}
            </span>
            <span className="text-xs font-medium text-on-surface-variant sm:text-sm">
              {lang === 'bn' ? 'মোট আনুমানিক ভাড়া' : 'total fare (approx.)'}
            </span>
          </div>
          {fareBreakdownText && (
            <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
              {fareBreakdownText}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5 tabular-nums sm:gap-6">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Duration
            </span>
            <div className="flex items-center gap-1 text-base font-bold text-on-surface">
              <Clock className="h-4 w-4 text-tertiary" aria-hidden="true" />
              <span>{option.totalMinutes} min</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Rides
            </span>
            <span className="text-base font-bold text-on-surface">
              {option.rides} {option.rides === 1 ? 'ride' : 'rides'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Walking
            </span>
            <span className="text-base font-bold text-on-surface">
              {formatKm(option.walkKm)}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-modal Proportional Segment Strip */}
      <div className="my-2">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
          <span>Route Journey Progression</span>
          <span>
            {option.rides} {option.rides === 1 ? 'ride' : 'rides'}
            {walkLegs.length > 0 ? ` · ${walkLegs.length} walk` : ''}
          </span>
        </div>

        <div
          className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-container"
          aria-hidden="true"
        >
          {option.legs.map((leg, i) => {
            const share = Math.max(0.05, leg.minutes / totalLegMinutes);
            const isWalk = leg.mode === 'walk';
            return (
              <div
                key={`${leg.from}-${leg.to}-${i}`}
                title={`${leg.lineName} (${leg.minutes} min)`}
                style={{
                  flex: share,
                  background: isWalk
                    ? 'repeating-linear-gradient(90deg, var(--c-walk) 0 4px, transparent 4px 7px)'
                    : getLegColor(leg),
                }}
                className="h-full"
              />
            );
          })}
        </div>

        {/* Leg Detail Badges */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {displayLegs.map((leg, i) => {
            const { title, subtitle } = describeLeg(leg);
            const color = getLegColor(leg);
            const isMeOrigin = leg.from === 'ME';
            return (
              <div
                key={`${leg.from}-${leg.to}-${i}`}
                className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-2.5"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: color }}
                >
                  <ModeIcon mode={leg.mode} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-on-surface">
                      {isMeOrigin ? title : `${leg.fromName} → ${leg.toName}`}
                    </span>
                    {!isMeOrigin && (
                      <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                        {leg.lineName}
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                    {leg.fare > 0 ? formatRupee(leg.fare) : 'Free'} · {leg.minutes} min · {subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="-mx-4 -mb-4 mt-4 flex flex-col items-stretch justify-between gap-3 bg-surface-container/40 px-4 py-3.5 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:px-6">
        <div className="text-xs font-medium text-on-surface-variant">
          {walkLegs.length > 0
            ? `Includes ${formatKm(option.walkKm)} walking interchange`
            : `${option.rides} direct transit ${option.rides === 1 ? 'segment' : 'segments'} · Fares approximate`}
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => onSaveOption(option)}
            className="min-h-[40px] flex-1 rounded-lg bg-surface-container-highest px-4 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container sm:flex-none"
          >
            {isSaved ? 'Saved' : 'Save Route'}
          </button>
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-container sm:flex-none"
          >
            <span>
              {lang === 'bn' ? 'ধাপ দেখুন' : 'View Steps / ধাপ দেখুন'}
            </span>
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
