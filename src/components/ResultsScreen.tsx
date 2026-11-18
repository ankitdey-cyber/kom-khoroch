import React, { useMemo, useState } from 'react';
import type {
  CabReference,
  LangKey,
  PlanTripResult,
  RouteOption,
  TripOptions,
} from '../types';
import { formatRupee, getModeSummary } from '../utils/transit';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  CreditCard,
  Crosshair,
  Footprints,
  IndianRupee,
  TrendingDown,
  Wallet,
  Zap,
} from './Icons';
import { OptionCard } from './OptionCard';

type SortKey = 'fare' | 'rides' | 'walk';

interface ResultsScreenProps {
  fromName: string;
  toName: string;
  options: TripOptions;
  onChangeOptions: (next: TripOptions) => void;
  tripResult: PlanTripResult | null;
  budgetAmount: number | null;
  selectedSignature: string | null;
  savedSignatureSet: Set<string>;
  onSelectOption: (signature: string) => void;
  onSaveOption: (option: RouteOption) => void;
  onBackToPlan: () => void;
  onUseMyLocation: () => void;
  isLocating: boolean;
  locationError: string | null;
  lang: LangKey;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  fromName,
  toName,
  options,
  onChangeOptions,
  tripResult,
  budgetAmount,
  selectedSignature,
  savedSignatureSet,
  onSelectOption,
  onSaveOption,
  onBackToPlan,
  onUseMyLocation,
  isLocating,
  locationError,
  lang,
}) => {
  const [sortBy, setSortBy] = useState<SortKey>('fare');

  const routeOptions = useMemo(() => {
    const list = [...(tripResult?.options ?? [])];
    if (sortBy === 'rides') {
      return list.sort(
        (a, b) => a.rides - b.rides || a.totalFare - b.totalFare
      );
    }
    if (sortBy === 'walk') {
      return list.sort(
        (a, b) => a.walkKm - b.walkKm || a.totalFare - b.totalFare
      );
    }
    return list.sort(
      (a, b) => a.totalFare - b.totalFare || a.totalMinutes - b.totalMinutes
    );
  }, [tripResult, sortBy]);

  const cab: CabReference | null = tripResult?.cab ?? null;
  const cheapest =
    tripResult && tripResult.options.length > 0 ? tripResult.options[0] : null;
  const fastest = useMemo(() => {
    if (!tripResult || tripResult.options.length === 0) return null;
    return [...tripResult.options].sort(
      (a, b) => a.totalMinutes - b.totalMinutes
    )[0];
  }, [tripResult]);

  const maxFare =
    tripResult && tripResult.options.length > 0
      ? Math.max(...tripResult.options.map((o) => o.totalFare))
      : 0;
  const maxSavings =
    cab && cheapest ? Math.max(0, cab.fare - cheapest.totalFare) : 0;
  const monthlySavings = maxSavings * 2 * 22;
  const pctSaved =
    cab && cheapest && cab.fare > 0
      ? Math.round(((cab.fare - cheapest.totalFare) / cab.fare) * 100)
      : 0;

  return (
    <div className="flex w-full flex-col pb-12">
      {/* Top Route Header & Utility Bar */}
      <section className="mb-6 py-2">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <button
                type="button"
                onClick={onBackToPlan}
                className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-1.5 text-primary transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>
                  {lang === 'bn' ? 'রুট পরিবর্তন' : 'Plan / রুট পরিবর্তন'}
                </span>
              </button>
              <span aria-hidden="true">·</span>
              <span>
                {options.peak ? 'Peak hour' : 'Off-peak'}
                {options.smartCard ? ' · Metro Smart Card (-10%)' : ''}
                {options.avoid.length > 0
                  ? ` · Avoid ${options.avoid.join(', ')}`
                  : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                {fromName}{' '}
                <ArrowRight
                  className="mx-1 inline h-5 w-5 text-primary"
                  aria-hidden="true"
                />{' '}
                {toName}
              </h1>
              <button
                type="button"
                onClick={onBackToPlan}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-surface-container px-3.5 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Quick Route Statistics */}
          <div className="flex flex-wrap items-center gap-3">
            {cab && cheapest && (
              <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-low px-3.5 py-2 shadow-[var(--shadow-sm)]">
                <TrendingDown
                  className="h-5 w-5 text-secondary"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium leading-none text-on-surface-variant">
                    Potential Savings
                  </span>
                  <span className="mt-1 text-sm font-bold text-secondary tabular-nums">
                    Up to {formatRupee(maxSavings)}
                  </span>
                </div>
              </div>
            )}

            {fastest && (
              <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-low px-3.5 py-2 shadow-[var(--shadow-sm)]">
                <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium leading-none text-on-surface-variant">
                    Fastest Option
                  </span>
                  <span className="mt-1 text-sm font-bold text-on-surface tabular-nums">
                    {fastest.totalMinutes} min · {formatRupee(fastest.totalFare)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sort & Smart Card Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSortBy('fare')}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              sortBy === 'fare'
                ? 'bg-primary-container text-on-primary-container shadow-[var(--shadow-sm)]'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high shadow-[var(--shadow-sm)]'
            }`}
          >
            <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Lowest Fare First</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('rides')}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              sortBy === 'rides'
                ? 'bg-primary-container text-on-primary-container shadow-[var(--shadow-sm)]'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high shadow-[var(--shadow-sm)]'
            }`}
          >
            <span>Least Rides</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('walk')}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              sortBy === 'walk'
                ? 'bg-primary-container text-on-primary-container shadow-[var(--shadow-sm)]'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high shadow-[var(--shadow-sm)]'
            }`}
          >
            <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Minimum Walking</span>
          </button>

          <button
            type="button"
            aria-pressed={options.smartCard}
            onClick={() =>
              onChangeOptions({ ...options, smartCard: !options.smartCard })
            }
            className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors shadow-[var(--shadow-sm)] ${
              options.smartCard
                ? 'bg-secondary-container text-on-secondary-fixed'
                : 'bg-surface-container-lowest text-secondary hover:bg-surface-container-high'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Smart Card {options.smartCard ? 'Active (-10%)' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            disabled={isLocating}
            onClick={onUseMyLocation}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-surface-container-lowest px-3.5 py-1.5 text-xs font-bold text-primary shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-fixed disabled:opacity-60"
          >
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isLocating ? 'Finding you...' : 'Where am I?'}</span>
          </button>
        </div>

        {locationError && (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-xs font-semibold text-error"
          >
            {locationError}
          </p>
        )}
      </section>

      {/* Main 2-Column Layout: Route Cards (8 Cols) vs Cost Matrix (4 Cols) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {routeOptions.length > 0 ? (
            routeOptions.map((opt) => (
              <OptionCard
                key={opt.signature}
                option={opt}
                selected={selectedSignature === opt.signature}
                isSaved={savedSignatureSet.has(opt.signature)}
                cab={cab}
                budgetAmount={budgetAmount}
                onSelect={() => onSelectOption(opt.signature)}
                onSaveOption={onSaveOption}
                lang={lang}
              />
            ))
          ) : (
            <div className="rounded-xl bg-surface-container-lowest p-6 text-sm text-on-surface shadow-[var(--shadow-sm)]">
              <strong className="block text-base">No route found.</strong>
              <p className="mt-1 text-on-surface-variant">
                Allow more transport modes or increase your maximum walk
                distance on the Plan screen and try again.
              </p>
              <button
                type="button"
                onClick={onBackToPlan}
                className="mt-4 inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Adjust Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Fare Comparison Matrix */}
        <aside className="flex flex-col gap-5 lg:col-span-4">
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IndianRupee
                  className="h-4 w-4 text-secondary"
                  aria-hidden="true"
                />
                <h2 className="text-base font-bold text-on-surface">
                  Fare Comparison Matrix
                </h2>
              </div>
              <span className="rounded bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                Approx.
              </span>
            </div>

            <p className="mb-4 text-xs text-on-surface-variant">
              Comparison for {fromName} to {toName} under{' '}
              {options.peak ? 'peak hour' : 'off-peak'} conditions:
            </p>

            <div className="flex flex-col gap-2.5">
              {cheapest && (
                <div className="flex items-center justify-between rounded-xl bg-secondary-container/35 p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-on-secondary">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-secondary">
                        Kom Khoroch Transit
                      </div>
                      <div className="truncate text-[11px] text-on-surface-variant">
                        {getModeSummary(cheapest)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="text-sm font-extrabold text-secondary">
                      {cheapest.totalFare === maxFare
                        ? formatRupee(cheapest.totalFare)
                        : `${formatRupee(cheapest.totalFare)} – ${formatRupee(maxFare)}`}
                    </div>
                    {pctSaved > 0 && (
                      <div className="text-[11px] font-bold text-secondary">
                        Save {pctSaved}%
                      </div>
                    )}
                  </div>
                </div>
              )}

              {cab && (
                <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: 'var(--c-cab)',
                        color: 'var(--c-on-cab)',
                      }}
                    >
                      <Car className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">
                        Direct App Cab
                      </div>
                      <div className="text-[11px] text-on-surface-variant">
                        {options.peak ? 'Peak surge' : 'Standard'} · ~
                        {cab.minutes} min
                      </div>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-sm font-bold text-on-surface">
                      {formatRupee(cab.fare)}
                    </div>
                    <div className="text-[11px] font-medium text-error">
                      Est. single ride
                    </div>
                  </div>
                </div>
              )}
            </div>

            {monthlySavings > 0 && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary-fixed/40 p-3.5">
                <Wallet
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="text-xs text-on-surface-variant">
                  <strong className="block font-bold text-on-surface">
                    Monthly Commuter Savings
                  </strong>
                  <span>
                    Save around{' '}
                    <strong className="font-bold text-primary tabular-nums">
                      {formatRupee(monthlySavings)}/month
                    </strong>{' '}
                    (22 working days round trip vs cab).
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-surface-container-low p-4 text-xs text-on-surface-variant shadow-[var(--shadow-sm)]">
            <h3 className="mb-2 text-sm font-bold text-on-surface">
              কেন এত কম খরচ? (Why lower cost)
            </h3>
            <p className="leading-relaxed">
              Suburban EMU trains, Kolkata Metro corridors, buses, and Hooghly
              ferries run on regulated slab tariffs with zero surge pricing.
            </p>
            <p className="mt-2 font-semibold text-on-surface">
              Fares are approximate estimates.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
