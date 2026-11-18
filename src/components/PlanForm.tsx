import React, { useState } from 'react';
import type { AvoidableMode, LangKey, Stop, TripOptions } from '../types';
import { parseTripQuery } from '../utils/parseTripQuery';
import {
  AVOID_MODES,
  FREQUENT_STOPS,
  STOP_MAP,
  formatRupee,
} from '../utils/transit';
import { ArrowRightIcon, SwapIcon } from './Icons';
import { StopAutocomplete } from './StopAutocomplete';

interface PlanFormProps {
  fromText: string;
  toText: string;
  onChangeFrom: (val: string) => void;
  onChangeTo: (val: string) => void;
  onSwap: () => void;
  options: TripOptions;
  onChangeOptions: (next: TripOptions) => void;
  budget: string;
  onChangeBudget: (val: string) => void;
  stops: Stop[];
  error: string | null;
  onSubmit: () => void;
  lang: LangKey;
}

const SAMPLE_QUERY = 'cheapest way from Serampore to Sector V, no bus';

export const PlanForm: React.FC<PlanFormProps> = ({
  fromText,
  toText,
  onChangeFrom,
  onChangeTo,
  onSwap,
  options,
  onChangeOptions,
  budget,
  onChangeBudget,
  stops,
  error,
  onSubmit,
  lang,
}) => {
  const [phrase, setPhrase] = useState<string>('');
  const [phraseFeedback, setPhraseFeedback] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);

  const toggleAvoid = (mode: AvoidableMode) => {
    const exists = options.avoid.includes(mode);
    const nextAvoid = exists
      ? options.avoid.filter((m) => m !== mode)
      : [...options.avoid, mode];
    onChangeOptions({ ...options, avoid: nextAvoid });
  };

  const applyPhrase = (textToParse: string) => {
    const res = parseTripQuery(textToParse, stops, options);
    if (res.error) {
      setPhraseFeedback({ kind: 'err', text: res.error });
      return;
    }

    if (res.fromName) onChangeFrom(res.fromName);
    if (res.toName) onChangeTo(res.toName);
    if (res.budget !== undefined) onChangeBudget(res.budget);

    onChangeOptions({
      ...options,
      avoid: res.avoid ?? options.avoid,
      timeValuePer10Min:
        res.timeValuePer10Min !== undefined
          ? res.timeValuePer10Min
          : options.timeValuePer10Min,
      peak: res.peak !== undefined ? res.peak : options.peak,
      smartCard:
        res.smartCard !== undefined ? res.smartCard : options.smartCard,
      maxWalkKm:
        res.maxWalkKm !== undefined ? res.maxWalkKm : options.maxWalkKm,
    });

    setPhraseFeedback({
      kind: 'ok',
      text: `Applied: ${res.summaryParts.join(' · ')}`,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-4 rounded-[12px] border border-rule bg-surface p-4"
      noValidate
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-lg font-extrabold tracking-tight text-ink">
          {lang === 'bn' ? 'সাশ্রয়ী রুট খুঁজুন' : 'Plan Kolkata Commute'}
        </h1>
        <span className="text-xs font-medium text-muted">
          {lang === 'bn' ? 'ভাড়া আনুমানিক' : 'Kolkata & Hooghly'}
        </span>
      </div>

      {/* Quick plain-text trip parser */}
      <div className="grid gap-1.5 rounded-[8px] border border-rule bg-bg p-2.5">
        <label
          htmlFor="quick-phrase"
          className="text-xs font-medium text-muted"
        >
          {lang === 'bn' ? 'এক লাইনে লিখুন' : 'Quick phrase'}
        </label>
        <div className="flex gap-2">
          <input
            id="quick-phrase"
            type="text"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value);
              if (phraseFeedback) setPhraseFeedback(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyPhrase(phrase);
              }
            }}
            placeholder={SAMPLE_QUERY}
            className="min-h-[40px] min-w-0 flex-1 rounded-[8px] border border-rule bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          />
          <button
            type="button"
            onClick={() => applyPhrase(phrase)}
            className="min-h-[40px] shrink-0 rounded-[8px] border border-ink bg-ink px-3.5 py-1.5 font-display text-xs font-bold text-bg whitespace-nowrap transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            {lang === 'bn' ? 'প্রয়োগ' : 'Apply'}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setPhrase(SAMPLE_QUERY);
              applyPhrase(SAMPLE_QUERY);
            }}
            className="text-left text-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            Try: &ldquo;{SAMPLE_QUERY}&rdquo;
          </button>
        </div>
        {phraseFeedback && (
          <p
            role="status"
            aria-live="polite"
            className={`text-xs font-medium ${
              phraseFeedback.kind === 'err' ? 'text-bad' : 'text-good'
            }`}
          >
            {phraseFeedback.text}
          </p>
        )}
      </div>

      {/* Stacked From / To with Swap button */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2.5">
        <div className="grid min-w-0 gap-2.5">
          <StopAutocomplete
            label={lang === 'bn' ? 'যাত্রা শুরু (From)' : 'From'}
            value={fromText}
            onChange={onChangeFrom}
            stops={stops}
            placeholder="e.g. Serampore"
            markerText="A"
            markerColor="var(--c-green)"
          />
          <StopAutocomplete
            label={lang === 'bn' ? 'গন্তব্য (To)' : 'To'}
            value={toText}
            onChange={onChangeTo}
            stops={stops}
            placeholder="e.g. Salt Lake Sector V"
            markerText="B"
            markerColor="var(--c-orange)"
          />
        </div>

        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap from and to stops"
          className="mt-5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rule bg-surface text-ink transition-colors hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
        >
          <SwapIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Frequent destination buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted">
          {lang === 'bn' ? 'জনপ্রিয়:' : 'Popular:'}
        </span>
        {FREQUENT_STOPS.map((item) => {
          const stopName = STOP_MAP[item.id]?.name ?? item.label;
          const active =
            toText.trim().toLowerCase() === stopName.toLowerCase();
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTo(stopName)}
              className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
                active
                  ? 'border-ink bg-ink text-bg'
                  : 'border-rule bg-bg text-ink hover:border-ink/40'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Condition chips: Peak hour & Metro smart card */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Travel conditions"
      >
        <button
          type="button"
          aria-pressed={options.peak}
          onClick={() => onChangeOptions({ ...options, peak: !options.peak })}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
            options.peak
              ? 'border-ink bg-ink text-bg'
              : 'border-rule bg-bg text-ink hover:border-ink/40'
          }`}
        >
          <span>{lang === 'bn' ? 'পিক আওয়ার' : 'Peak hour'}</span>
          <span className="font-display text-[11px] opacity-80">
            {options.peak ? 'On' : 'Off'}
          </span>
        </button>

        <button
          type="button"
          aria-pressed={options.smartCard}
          onClick={() =>
            onChangeOptions({ ...options, smartCard: !options.smartCard })
          }
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
            options.smartCard
              ? 'border-ink bg-ink text-bg'
              : 'border-rule bg-bg text-ink hover:border-ink/40'
          }`}
        >
          <span>
            {lang === 'bn'
              ? 'মেট্রো স্মার্ট কার্ড (-১০%)'
              : 'Metro smart card (-10%)'}
          </span>
        </button>
      </div>

      {/* Avoid mode chips */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Avoid modes"
      >
        <span className="mr-1 text-xs font-medium text-muted">
          {lang === 'bn' ? 'এড়িয়ে চলুন:' : 'Avoid:'}
        </span>
        {AVOID_MODES.map((m) => {
          const isAvoided = options.avoid.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={isAvoided}
              onClick={() => toggleAvoid(m.key)}
              className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
                isAvoided
                  ? 'border-bad bg-bad text-white'
                  : 'border-rule bg-bg text-ink hover:border-ink/40'
              }`}
            >
              {lang === 'bn' ? m.bn : m.label}
            </button>
          );
        })}
      </div>

      {/* Max walk + Optional budget */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="max-walk"
            className="mb-1 block text-xs font-medium text-muted"
          >
            {lang === 'bn' ? 'সর্বোচ্চ হাঁটার দূরত্ব' : 'Max walk per stretch'}
          </label>
          <select
            id="max-walk"
            value={options.maxWalkKm}
            onChange={(e) =>
              onChangeOptions({
                ...options,
                maxWalkKm: Number(e.target.value),
              })
            }
            className="min-h-[44px] w-full rounded-[8px] border border-rule bg-bg px-3 py-2 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            <option value={0.5}>0.5 km (500 m)</option>
            <option value={1}>1 km</option>
            <option value={1.5}>1.5 km</option>
            <option value={2}>2 km</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="trip-budget"
            className="mb-1 block text-xs font-medium text-muted"
          >
            {lang === 'bn' ? 'বাজেট (₹, ঐচ্ছিক)' : 'Trip budget (₹, optional)'}
          </label>
          <input
            id="trip-budget"
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            placeholder="e.g. 60"
            value={budget}
            onChange={(e) => onChangeBudget(e.target.value)}
            className="min-h-[44px] w-full rounded-[8px] border border-rule bg-bg px-3 py-2 text-sm font-medium text-ink tabular-nums placeholder:text-muted/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          />
        </div>
      </div>

      {/* Time value slider */}
      <div className="rounded-[8px] border border-rule bg-bg p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="time-value" className="text-xs font-medium text-muted">
            {lang === 'bn'
              ? '১০ মিনিট বাঁচানোর মূল্য'
              : 'Value of saving 10 min'}
          </label>
          <span className="font-display text-sm font-extrabold text-ink tabular-nums">
            {formatRupee(options.timeValuePer10Min)}
          </span>
        </div>
        <input
          id="time-value"
          type="range"
          min={0}
          max={100}
          step={5}
          value={options.timeValuePer10Min}
          onChange={(e) =>
            onChangeOptions({
              ...options,
              timeValuePer10Min: Number(e.target.value),
            })
          }
          className="mt-2 w-full cursor-pointer"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
          <span>₹0 (Cheapest)</span>
          <span>₹20 (Balanced)</span>
          <span>₹100 (Fastest)</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563C9]"
      >
        <span>{lang === 'bn' ? 'রুট খুঁজুন' : 'Find routes'}</span>
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </form>
  );
};
