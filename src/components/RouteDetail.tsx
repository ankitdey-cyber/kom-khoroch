import React, { useState } from 'react';
import type { CabReference, LangKey, RouteOption } from '../types';
import {
  buildShareText,
  describeLeg,
  formatRupee,
  getLegColor,
  network,
} from '../utils/transit';
import { ArrowLeftIcon, BookmarkIcon, ShareIcon } from './Icons';
import { RouteMap } from './RouteMap';

interface RouteDetailProps {
  fromName: string;
  toName: string;
  option: RouteOption;
  cab: CabReference | null;
  isSaved: boolean;
  onSave: () => void;
  onBack: () => void;
  showBackButton?: boolean;
  lang: LangKey;
}

export const RouteDetail: React.FC<RouteDetailProps> = ({
  fromName,
  toName,
  option,
  cab,
  isSaved,
  onSave,
  onBack,
  showBackButton = true,
  lang,
}) => {
  const [copyStatus, setCopyStatus] = useState<string>('');
  const monthlyFare = option.totalFare * 2 * 22;
  const cabMonthly = cab ? cab.fare * 2 * 22 : null;

  const handleShare = async () => {
    const text = buildShareText(fromName, toName, option);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied route summary to clipboard.');
    } catch {
      setCopyStatus('Clipboard blocked. Please copy the steps manually.');
    }
  };

  return (
    <div className="grid gap-3">
      {showBackButton && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'ফলাফলে ফিরুন' : 'Back to results'}</span>
          </button>

          <span className="font-display text-xs font-bold tracking-wide text-muted">
            {option.labels.join(' · ')}
          </span>
        </div>
      )}

      <section className="grid gap-4 rounded-[12px] border border-rule bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              {fromName} → {toName}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {option.labels.join(' · ')} ·{' '}
              {lang === 'bn'
                ? 'ধাপে ধাপে নির্দেশিকা · আনুমানিক ভাড়া'
                : 'Step-by-step itinerary · Fares are approximate'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSave}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
                isSaved
                  ? 'border-good bg-good/15 text-good'
                  : 'border-rule bg-bg text-ink hover:border-ink/40'
              }`}
            >
              <BookmarkIcon className="h-4 w-4" filled={isSaved} />
              <span>
                {isSaved
                  ? lang === 'bn'
                    ? 'সংরক্ষিত'
                    : 'Saved'
                  : lang === 'bn'
                    ? 'রুট সেভ করুন'
                    : 'Save commute'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-ink bg-ink px-3 py-2 text-xs font-semibold whitespace-nowrap text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
            >
              <ShareIcon className="h-4 w-4" />
              <span>{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Stat tiles: This trip, Door to door, Monthly (fare x 2 x 22) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[8px] border border-rule bg-bg p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-muted">This trip</div>
            <div className="mt-0.5 font-display text-lg font-extrabold text-ink tabular-nums sm:text-xl">
              {formatRupee(option.totalFare)}
            </div>
          </div>

          <div className="rounded-[8px] border border-rule bg-bg p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-muted">
              Door to door
            </div>
            <div className="mt-0.5 font-display text-lg font-extrabold text-ink tabular-nums sm:text-xl">
              {option.totalMinutes} min
            </div>
          </div>

          <div className="rounded-[8px] border border-rule bg-bg p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-muted">
              Monthly (×2×22)
            </div>
            <div className="mt-0.5 font-display text-lg font-extrabold text-ink tabular-nums sm:text-xl">
              {formatRupee(monthlyFare)}
            </div>
          </div>
        </div>

        {cab && cabMonthly !== null && (
          <p className="rounded-[8px] border border-good/30 bg-good/10 px-3 py-2 text-xs text-ink">
            Direct cab estimate:{' '}
            <strong className="tabular-nums">{formatRupee(cab.fare)}</strong> (
            {cab.minutes} min/trip, ~
            <strong className="tabular-nums">
              {formatRupee(cabMonthly)}/month
            </strong>
            ). This plan saves about{' '}
            <strong className="text-good tabular-nums">
              {formatRupee(Math.max(0, cabMonthly - monthlyFare))}/month
            </strong>
            .
          </p>
        )}

        {/* Leg list */}
        <ol className="m-0 grid list-none p-0">
          {option.legs.map((leg, idx) => {
            const { title, subtitle } = describeLeg(leg);
            const isWalk = leg.mode === 'walk';
            const tag = network.modes[leg.mode].tag;
            const color = getLegColor(leg);

            return (
              <li
                key={`${leg.from}-${leg.to}-${idx}`}
                className={`grid grid-cols-[34px_1fr_auto] items-start gap-3 py-3 ${
                  idx > 0 ? 'border-t border-rule' : ''
                }`}
              >
                <span
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[8px] font-display text-xs font-extrabold ${
                    isWalk ? 'border-2 border-dashed bg-transparent' : 'text-white'
                  }`}
                  style={
                    isWalk
                      ? { borderColor: 'var(--c-walk)', color: 'var(--c-walk)' }
                      : { backgroundColor: color }
                  }
                  aria-label={network.modes[leg.mode].label}
                >
                  {tag}
                </span>

                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-snug text-ink">
                    {title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
                </div>

                <div className="text-right tabular-nums">
                  <div className="font-display text-sm font-extrabold text-ink">
                    {leg.fare > 0 ? formatRupee(leg.fare) : 'Free'}
                  </div>
                  <div className="text-xs text-muted">{leg.minutes} min</div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Schematic SVG map */}
        <RouteMap option={option} />

        {copyStatus && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs font-medium text-good"
          >
            {copyStatus}
          </p>
        )}

        <p className="text-xs text-muted">
          Fares and durations are approximate estimates based on standard transit
          slabs.
        </p>
      </section>
    </div>
  );
};
