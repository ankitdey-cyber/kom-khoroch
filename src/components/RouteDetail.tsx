import React, { useState } from 'react';
import type { CabReference, LangKey, RouteOption } from '../types';
import {
  STOP_MAP,
  buildShareText,
  describeLeg,
  formatKm,
  formatRupee,
  getLegColor,
  getLegForeground,
  getModeSummary,
  network,
} from '../utils/transit';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  IndianRupee,
  Info,
  Lightbulb,
  MapIcon,
  MapPin,
  Route,
  Share2,
  TrendingDown,
} from './Icons';
import { RouteMap } from './RouteMap';

interface RouteDetailProps {
  fromName: string;
  toName: string;
  option: RouteOption;
  cab: CabReference | null;
  originPoint?: { lat: number; lng: number } | null;
  isSaved: boolean;
  onSave: () => void;
  onBack: () => void;
  lang: LangKey;
}

export const RouteDetail: React.FC<RouteDetailProps> = ({
  fromName,
  toName,
  option,
  cab,
  originPoint = null,
  isSaved,
  onSave,
  onBack,
  lang,
}) => {
  const [copyStatus, setCopyStatus] = useState<string>('');
  const monthlyFare = option.totalFare * 2 * 22;
  const cabMonthly = cab ? cab.fare * 2 * 22 : null;
  const tripSavings = cab ? Math.max(0, cab.fare - option.totalFare) : 0;
  const monthlySavings =
    cabMonthly !== null ? Math.max(0, cabMonthly - monthlyFare) : 0;
  const pctSaved =
    cab && cab.fare > 0
      ? Math.max(0, Math.round((tripSavings / cab.fare) * 100))
      : 0;

  const rideLegs = option.legs.filter((l) => l.mode !== 'walk');
  const breakdownSummary = rideLegs
    .map((l) => `${formatRupee(l.fare)} ${network.modes[l.mode].label}`)
    .join(' + ');

  const handleShare = async () => {
    const text = buildShareText(fromName, toName, option);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied route summary to clipboard.');
    } catch {
      setCopyStatus('Clipboard blocked. Please copy the route steps manually.');
    }
  };

  return (
    <div className="flex w-full flex-col pb-12">
      {/* Top Navigation & Header */}
      <div className="mb-6 flex flex-col gap-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg px-1.5 text-left text-sm font-bold text-primary transition-colors hover:bg-surface-container-low"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            <span>
              {lang === 'bn'
                ? `ফলাফলে ফিরুন (${fromName} → ${toName})`
                : `Back to Results (${fromName} → ${toName})`}
            </span>
          </button>

          <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-fixed">
            {option.labels.join(' · ')}
          </span>
        </div>

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-on-primary-fixed">
              <Route className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{option.labels.join(' · ')} Multi-Modal Route</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
              {fromName}{' '}
              <span className="font-normal text-on-surface-variant">to</span>{' '}
              {toName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-secondary">
              রুট বিবরণী ও যাতায়াত নির্দেশিকা{' '}
              <span className="font-normal text-on-surface-variant">
                · {getModeSummary(option)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onSave}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow-[var(--shadow-sm)] transition-colors ${
                isSaved
                  ? 'bg-secondary-container text-on-secondary-fixed'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
              }`}
            >
              <Bookmark
                className={`h-4 w-4 ${isSaved ? 'fill-current text-secondary' : 'text-primary'}`}
                aria-hidden="true"
              />
              <span>
                {isSaved
                  ? lang === 'bn'
                    ? 'সংরক্ষিত'
                    : 'Saved to Commutes'
                  : lang === 'bn'
                    ? 'রুট সেভ করুন'
                    : 'Save commute'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-on-secondary shadow-[var(--shadow-sm)] transition-colors hover:opacity-90"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'শেয়ার করুন' : 'Share route'}</span>
            </button>
          </div>
        </div>

        {copyStatus && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs font-semibold text-secondary"
          >
            {copyStatus}
          </p>
        )}
      </div>

      {/* Savings Alert Banner */}
      {cab && tripSavings > 0 && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-secondary-container/80 via-surface-container-low to-primary-fixed/40 p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-on-secondary shadow-[var(--shadow-sm)]">
                <TrendingDown className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold tracking-tight text-on-secondary-fixed tabular-nums sm:text-xl">
                    Save {formatRupee(tripSavings)}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-on-secondary">
                    {pctSaved}% Cheaper
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-on-surface sm:text-sm">
                  Direct cab estimate is{' '}
                  <strong className="text-error line-through tabular-nums">
                    {formatRupee(cab.fare)}
                  </strong>{' '}
                  (~{cab.minutes} min). Fares are approximate.
                </p>
              </div>
            </div>

            <div className="self-start rounded-lg bg-surface-container-lowest/85 px-3.5 py-2 text-left shadow-[var(--shadow-sm)] md:self-auto md:text-right">
              <div className="text-[11px] font-medium text-on-surface-variant">
                Monthly Cab Savings
              </div>
              <div className="text-sm font-bold text-secondary tabular-nums">
                {formatRupee(monthlySavings)} / month
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three Stat Tiles: This Trip, Door to door, Monthly (fare x 2 x 22) */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                This trip
              </span>
              <IndianRupee
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-primary tabular-nums sm:text-4xl">
                {formatRupee(option.totalFare)}
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                approx.
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-[11px]">
            <span className="font-semibold text-on-surface">Breakdown</span>
            <span className="truncate text-on-surface-variant">
              {breakdownSummary || 'On foot'}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Door to door
              </span>
              <Clock className="h-4 w-4 text-secondary" aria-hidden="true" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-extrabold text-secondary tabular-nums sm:text-4xl">
                {option.totalMinutes}
              </span>
              <span className="text-base font-bold text-on-surface">min</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-[11px]">
            <span className="font-semibold text-on-surface">Rides &amp; Walk</span>
            <span className="text-on-surface-variant tabular-nums">
              {option.rides} {option.rides === 1 ? 'ride' : 'rides'} ·{' '}
              {formatKm(option.walkKm)} walk
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Monthly (×2×22)
              </span>
              <span className="text-[11px] font-bold text-tertiary">
                22 days
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-on-surface tabular-nums sm:text-4xl">
                {formatRupee(monthlyFare)}
              </span>
              {cabMonthly !== null && (
                <span className="text-xs font-bold text-secondary tabular-nums">
                  (-{formatRupee(monthlySavings)})
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-[11px]">
            <span className="font-semibold text-on-surface">Round trips</span>
            <span className="font-bold text-secondary tabular-nums">
              {formatRupee(option.totalFare * 2)} / day
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left: Step-by-Step Timeline */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface sm:text-xl">
              <Route className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Step-by-Step Timeline (ধাপে ধাপে পথ)</span>
            </h2>
            <span className="rounded bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant tabular-nums">
              {option.legs.length} {option.legs.length === 1 ? 'Step' : 'Steps'}
            </span>
          </div>

          <div className="relative space-y-6 pl-7 before:absolute before:bottom-6 before:left-3 before:top-4 before:w-0.5 before:bg-surface-container-highest sm:pl-9">
            {option.legs.map((leg, idx) => {
              const { title, subtitle } = describeLeg(leg);
              const isWalk = leg.mode === 'walk';
              const tag = network.modes[leg.mode].tag;
              const color = getLegColor(leg);
              const fgColor = getLegForeground(leg);
              const intermediateStops =
                leg.via.length > 2 ? leg.via.slice(1, -1) : [];

              return (
                <div key={`${leg.from}-${leg.to}-${idx}`} className="relative">
                  {/* Timeline Node Badge */}
                  <div
                    className={`absolute -left-7 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold shadow-[var(--shadow-sm)] sm:-left-9 ${
                      isWalk ? 'border-2 border-dashed bg-surface-container-lowest' : ''
                    }`}
                    style={
                      isWalk
                        ? {
                            borderColor: 'var(--c-walk)',
                            color: 'var(--c-walk)',
                          }
                        : { backgroundColor: color, color: fgColor }
                    }
                    aria-label={network.modes[leg.mode].label}
                  >
                    {tag}
                  </div>

                  {/* Step Card */}
                  <div className="rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] sm:p-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{
                            backgroundColor: isWalk ? 'var(--c-walk)' : color,
                            color: isWalk ? 'var(--c-on-walk)' : fgColor,
                          }}
                        >
                          {network.modes[leg.mode].label}
                        </span>
                        {leg.from !== 'ME' &&
                          leg.lineName !== network.modes[leg.mode].label && (
                            <span className="text-xs font-semibold text-on-surface-variant">
                              {leg.lineName}
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant tabular-nums">
                        <span>{formatKm(leg.km)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-primary">
                          {leg.fare > 0 ? formatRupee(leg.fare) : 'Free'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{leg.minutes} min</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-on-surface">
                      {title}
                    </h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant sm:text-sm">
                      {subtitle}
                    </p>

                    {intermediateStops.length > 0 && (
                      <details className="mt-3 rounded-lg bg-surface-container-low px-3 py-1 text-xs">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 rounded-md py-2 font-bold text-on-surface hover:text-primary">
                          <span>
                            {intermediateStops.length} intermediate{' '}
                            {intermediateStops.length === 1 ? 'stop' : 'stops'}{' '}
                            along {leg.lineName}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                        </summary>
                        <div className="mb-2 mt-1 grid grid-cols-1 gap-1.5 border-t border-outline-variant/30 pt-2 text-on-surface-variant sm:grid-cols-2">
                          {intermediateStops.map((sid, sIdx) => (
                            <span key={sid}>
                              {sIdx + 1}. {STOP_MAP[sid]?.name ?? sid}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}

                    {leg.mode === 'rail' && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary-fixed/25 p-2.5 text-xs text-on-surface">
                        <Lightbulb
                          className="h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>
                          <strong>Ticketing Tip:</strong> Use UTS mobile app for
                          paperless suburban tickets without counter queues.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Arrival Node */}
            <div className="relative pt-1">
              <div className="absolute -left-7 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-secondary-container text-on-secondary-fixed shadow-[var(--shadow-sm)] sm:-left-9">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)]">
                <div>
                  <div className="text-sm font-bold text-on-surface">
                    Destination Reached: {toName}
                  </div>
                  <div className="text-xs text-on-surface-variant tabular-nums">
                    Total approx. fare: {formatRupee(option.totalFare)} · Total
                    time: {option.totalMinutes} min
                  </div>
                </div>
                <span className="rounded bg-secondary-container px-2.5 py-1 text-[11px] font-bold text-on-secondary-fixed">
                  Arrived
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Schematic Transit Map, Monthly Comparison & Interchange Guidelines */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold text-on-surface sm:text-base">
                  Schematic Transit Map
                </h2>
              </div>
              <span className="rounded bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                Stop Coordinates
              </span>
            </div>

            <RouteMap option={option} originPoint={originPoint} />
          </div>

          {cab && cabMonthly !== null && (
            <div className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-on-surface">
                  Monthly Cost Comparison
                </h3>
                <span className="text-[11px] font-bold text-secondary">
                  22 Days Round Trip
                </span>
              </div>

              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-secondary">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Kom Khoroch Multi-modal</span>
                    </span>
                    <span className="font-bold text-on-surface tabular-nums">
                      {formatRupee(monthlyFare)} / mo
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{
                        width: `${Math.max(
                          6,
                          Math.min(
                            100,
                            Math.round((monthlyFare / Math.max(1, cabMonthly)) * 100)
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-on-surface-variant">
                    <span>Direct App Cab</span>
                    <span className="font-bold text-error tabular-nums">
                      {formatRupee(cabMonthly)} / mo
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div className="h-full w-full rounded-full bg-error" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3.5">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-on-surface-variant">
                    Annual Net Saving
                  </div>
                  <div className="text-xl font-extrabold text-secondary tabular-nums">
                    {formatRupee(monthlySavings * 12)}
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-on-secondary">
                  12-Month Est.
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface">
              <Info className="h-4 w-4 text-secondary" aria-hidden="true" />
              <span>Commuter Tips</span>
            </h3>
            <ul className="space-y-2.5 text-xs text-on-surface-variant">
              <li className="flex items-start gap-2">
                <CreditCard
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>
                  <strong>Smart Card Perk:</strong> Kolkata Metro Smart Card
                  applies a 10% discount on metro legs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                  aria-hidden="true"
                />
                <span>
                  Fares and durations are approximate estimates based on
                  standard transit slabs.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
