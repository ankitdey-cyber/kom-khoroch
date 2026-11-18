import React, { useEffect, useMemo, useState } from 'react';
import type {
  AvoidableMode,
  LangKey,
  PlanTripResult,
  RouteOption,
  Stop,
  TripOptions,
} from '../types';
import { parseTripQueryWithApi } from '../utils/parseTripQuery';
import {
  AVOID_MODES,
  FREQUENT_STOPS,
  STOP_MAP,
  formatRupee,
  getLegColor,
  getModeSummary,
  network,
} from '../utils/transit';
import {
  ArrowRight,
  ArrowUpDown,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Gauge,
  IndianRupee,
  MapIcon,
  Navigation,
  Route,
  Ship,
  Sparkles,
  TrainFront,
  Wallet,
  X,
} from './Icons';
import { StopAutocomplete } from './StopAutocomplete';

interface PlanFormProps {
  fromText: string;
  toText: string;
  fromName: string;
  toName: string;
  onChangeFrom: (val: string) => void;
  onChangeTo: (val: string) => void;
  onSwap: () => void;
  options: TripOptions;
  onChangeOptions: (next: TripOptions) => void;
  budget: string;
  onChangeBudget: (val: string) => void;
  stops: Stop[];
  error: string | null;
  tripResult: PlanTripResult | null;
  onSubmit: () => void;
  onSelectOption: (signature: string) => void;
  onGoToAbout: () => void;
  lang: LangKey;
}

const SAMPLE_PROMPTS = [
  {
    label: 'Cheapest Serampore to Sector V, no bus',
    query: 'cheapest way from Serampore to Sector V, no bus',
  },
  {
    label: 'Under ₹25 Sealdah to Airport',
    query: 'Cheapest under ₹25 from Sealdah to Airport',
  },
  {
    label: 'Off-peak Howrah to Sector V',
    query: 'Off-peak from Howrah to Salt Lake Sector V with smart card',
  },
];

const AVOID_ICON: Record<AvoidableMode, React.ReactNode> = {
  cab: <Car className="h-3.5 w-3.5" aria-hidden="true" />,
  bike: <Bike className="h-3.5 w-3.5" aria-hidden="true" />,
  bus: <Bus className="h-3.5 w-3.5" aria-hidden="true" />,
  auto: <Navigation className="h-3.5 w-3.5" aria-hidden="true" />,
  ferry: <Ship className="h-3.5 w-3.5" aria-hidden="true" />,
};

export const PlanForm: React.FC<PlanFormProps> = ({
  fromText,
  toText,
  fromName,
  toName,
  onChangeFrom,
  onChangeTo,
  onSwap,
  options,
  onChangeOptions,
  budget,
  onChangeBudget,
  stops,
  error,
  tripResult,
  onSubmit,
  onSelectOption,
  onGoToAbout,
  lang,
}) => {
  const [phrase, setPhrase] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [phraseFeedback, setPhraseFeedback] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const metroLineCount = useMemo(
    () => network.lines.filter((l) => l.mode === 'metro').length,
    []
  );
  const railLineCount = useMemo(
    () => network.lines.filter((l) => l.mode === 'rail').length,
    []
  );

  const cheapestOption: RouteOption | null =
    tripResult && tripResult.options.length > 0 ? tripResult.options[0] : null;
  const cabSavings =
    tripResult?.cab && cheapestOption
      ? Math.max(0, tripResult.cab.fare - cheapestOption.totalFare)
      : null;

  const toggleAvoid = (mode: AvoidableMode) => {
    const exists = options.avoid.includes(mode);
    const nextAvoid = exists
      ? options.avoid.filter((m) => m !== mode)
      : [...options.avoid, mode];
    onChangeOptions({ ...options, avoid: nextAvoid });
  };

  const applyPhrase = async (textToParse: string) => {
    if (analyzing || !isOnline) return;
    setAnalyzing(true);
    setPhraseFeedback(null);

    const res = await parseTripQueryWithApi(textToParse, options);
    setAnalyzing(false);

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
      text:
        res.summaryParts.length > 0
          ? `Applied: ${res.summaryParts.join(' · ')}`
          : 'Trip preferences updated.',
    });
  };

  const sliderReadout =
    options.timeValuePer10Min === 0
      ? '₹0: Lowest fare priority'
      : options.timeValuePer10Min >= 100
        ? '₹100: Fastest arrival priority'
        : `10 min saved = ${formatRupee(options.timeValuePer10Min)}`;

  // Schematic network preview lines projected from real stops in data/network.json
  const miniNetworkSvg = useMemo(() => {
    const K = 1000;
    const COS = Math.cos((22.6 * Math.PI) / 180);
    const proj = (id: string): [number, number] | null => {
      const s = STOP_MAP[id];
      if (!s) return null;
      return [(s.lng - 88.28) * COS * K, (22.95 - s.lat) * K];
    };
    const coreLines = network.lines.filter(
      (l) => l.mode === 'metro' || l.mode === 'rail' || l.mode === 'ferry'
    );
    const allPts = coreLines.flatMap((l) =>
      l.stops.map(proj).filter((p): p is [number, number] => p !== null)
    );
    if (!allPts.length) return null;
    const minX = Math.min(...allPts.map((p) => p[0])) - 14;
    const maxX = Math.max(...allPts.map((p) => p[0])) + 14;
    const minY = Math.min(...allPts.map((p) => p[1])) - 14;
    const maxY = Math.max(...allPts.map((p) => p[1])) + 14;
    return {
      viewBox: `${minX.toFixed(1)} ${minY.toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}`,
      lines: coreLines.map((l) => ({
        id: l.id,
        mode: l.mode,
        colorToken: l.colorToken,
        points: l.stops
          .map(proj)
          .filter((p): p is [number, number] => p !== null)
          .map((p) => p.join(','))
          .join(' '),
      })),
    };
  }, []);

  return (
    <div className="flex w-full flex-col pb-10">
      {/* Hero Banner matching Stitch Plan */}
      <section className="relative mb-6 w-full overflow-hidden rounded-3xl bg-surface-container-low shadow-[var(--shadow-sm)] md:mb-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary-container/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary-fixed/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col justify-between gap-6 px-4 py-6 sm:px-6 md:py-8 lg:flex-row lg:items-center lg:px-8">
          <div className="flex max-w-3xl flex-col">
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-on-secondary">
                সবচেয়ে সাশ্রয়ী যাতায়াত
              </span>
              <span className="text-on-surface-variant">
                Kolkata &amp; Hooghly Transit · Fares are approximate
              </span>
            </div>

            <h1 className="font-display text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl [text-wrap:balance]">
              Kom Khoroch <span className="font-normal text-primary">|</span>{' '}
              <span className="text-secondary">কম খরচ</span>
            </h1>

            <p className="mt-2 text-sm font-medium leading-relaxed text-on-surface-variant sm:text-base">
              {lang === 'bn'
                ? 'কলকাতা মেট্রো, লোকাল ট্রেন, বাস, অটো ও গঙ্গা ফেরির মধ্যে সবচেয়ে কম খরচের রুট তুলনা করুন।'
                : 'Calculate the smartest, lowest-fare routes across Kolkata Metro, Suburban Rail, Buses, Shared Autos & Hooghly Ferries.'}
            </p>
          </div>

          {/* Live Quick Metrics Stack */}
          <div className="grid min-w-[240px] grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-[var(--shadow-sm)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed">
                <IndianRupee className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-on-surface-variant">
                  Current Corridor Savings
                </div>
                <div className="text-sm font-bold text-secondary tabular-nums">
                  {cabSavings !== null && cheapestOption
                    ? `${formatRupee(cabSavings)} less than cab`
                    : 'Compare vs App Cab'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-[var(--shadow-sm)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                <TrainFront className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-on-surface-variant">
                  Connected Lines
                </div>
                <div className="text-sm font-bold text-on-surface tabular-nums">
                  {metroLineCount} Metro + {railLineCount} Local Rail
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Planner & Live Fare Preview Two-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left Column (7 Cols): Ask in Plain Words + Point-to-Point Route Form */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Ask in plain words card */}
          <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] sm:p-5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <label
                htmlFor="ai-transit-query"
                className="flex items-center gap-2 text-sm font-bold text-primary"
              >
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'সহজ ভাষায় লিখুন'
                    : 'Ask in plain words'}{' '}
                  <span className="font-normal text-on-surface-variant">
                    {lang === 'bn' ? '(Plain words)' : '(সহজ ভাষায় লিখুন)'}
                  </span>
                </span>
              </label>
              {isOnline ? (
                <span className="text-[11px] font-semibold text-secondary">
                  AI Route Parser
                </span>
              ) : (
                <span
                  role="status"
                  className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant"
                >
                  Needs internet
                </span>
              )}
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl bg-surface-container-low p-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/25 ${
                !isOnline ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input
                id="ai-transit-query"
                type="text"
                value={isOnline ? phrase : ''}
                disabled={!isOnline}
                onChange={(e) => {
                  setPhrase(e.target.value);
                  if (phraseFeedback) setPhraseFeedback(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void applyPhrase(phrase);
                  }
                }}
                placeholder={
                  isOnline
                    ? 'cheapest way from Serampore to Sector V, no bus'
                    : 'Needs internet'
                }
                className="min-h-[40px] min-w-0 flex-1 bg-transparent px-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/65 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={analyzing || !isOnline}
                onClick={() => void applyPhrase(phrase)}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-on-primary shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {!isOnline
                    ? 'Needs internet'
                    : analyzing
                      ? 'Parsing...'
                      : 'Analyze'}
                </span>
                {isOnline && (
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Sample plain-words buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-on-surface-variant">
                Try:
              </span>
              {SAMPLE_PROMPTS.map((item) => (
                <button
                  key={item.query}
                  type="button"
                  disabled={analyzing || !isOnline}
                  onClick={() => {
                    setPhrase(item.query);
                    void applyPhrase(item.query);
                  }}
                  className="min-h-[32px] rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {phraseFeedback && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-2.5 text-xs font-semibold ${
                  phraseFeedback.kind === 'err' ? 'text-error' : 'text-secondary'
                }`}
              >
                {phraseFeedback.text}
              </p>
            )}
          </div>

          {/* Core Point-to-Point Route Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            noValidate
            className="flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-on-surface">
                {lang === 'bn'
                  ? 'যাত্রার রুট নির্ধারণ করুন'
                  : 'Plan Point-to-Point Route'}
              </h2>
              <span className="rounded bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-fixed">
                Fare Comparison Active
              </span>
            </div>

            {/* Stacked Origin / Destination with floating Swap button */}
            <div className="relative flex flex-col gap-3">
              <StopAutocomplete
                label={
                  lang === 'bn'
                    ? 'যাত্রা শুরু (From)'
                    : 'From (উৎস - স্টেশন / বাসস্টপ)'
                }
                value={fromText}
                onChange={onChangeFrom}
                stops={stops}
                placeholder="e.g. Serampore / Howrah / Dum Dum"
                variant="origin"
              />

              <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2">
                <button
                  type="button"
                  onClick={onSwap}
                  aria-label="Swap origin and destination"
                  title="Swap Origin and Destination"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-[var(--shadow-md)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <StopAutocomplete
                label={
                  lang === 'bn'
                    ? 'গন্তব্য (To)'
                    : 'To (গন্তব্য - অফিস / কলেজ)'
                }
                value={toText}
                onChange={onChangeTo}
                stops={stops}
                placeholder="e.g. Salt Lake Sector V / Esplanade"
                variant="destination"
              />
            </div>

            {/* Frequent Quick Stops */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-on-surface-variant">
                {lang === 'bn' ? 'জনপ্রিয়:' : 'Frequent:'}
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
                    className={`min-h-[34px] rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-secondary-container text-on-secondary-fixed font-bold'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Condition toggles: Peak hour & Metro smart card */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-on-surface">
                  Commute Condition &amp; Cards:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={options.peak}
                    onClick={() =>
                      onChangeOptions({ ...options, peak: !options.peak })
                    }
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                      options.peak
                        ? 'bg-primary-fixed text-primary'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'পিক আওয়ার' : 'Peak hour'}{' '}
                      ({options.peak ? 'On' : 'Off'})
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={options.smartCard}
                    onClick={() =>
                      onChangeOptions({
                        ...options,
                        smartCard: !options.smartCard,
                      })
                    }
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                      options.smartCard
                        ? 'bg-secondary-container text-on-secondary-fixed-variant'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {lang === 'bn'
                        ? 'মেট্রো স্মার্ট কার্ড (-১০%)'
                        : 'Metro smart card (-10%)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Avoid mode chips */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    {lang === 'bn'
                      ? 'এড়িয়ে চলুন (যেগুলো ব্যবহার করতে চান না):'
                      : 'Avoid (যেগুলো এড়াতে চান):'}
                  </span>
                </div>
                <div
                  role="group"
                  aria-label="Avoid transport modes"
                  className="flex flex-wrap gap-2"
                >
                  {AVOID_MODES.map((m) => {
                    const isAvoided = options.avoid.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        type="button"
                        aria-pressed={isAvoided}
                        onClick={() => toggleAvoid(m.key)}
                        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                          isAvoided
                            ? 'bg-error-container text-error font-bold'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                        }`}
                      >
                        {AVOID_ICON[m.key]}
                        <span className={isAvoided ? 'line-through' : ''}>
                          {lang === 'bn' ? m.bn : m.label}
                        </span>
                        {isAvoided && (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Max walk & Optional Budget */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-container-low px-3.5 py-2.5">
                <label
                  htmlFor="max-walk"
                  className="mb-1 block text-[11px] font-semibold text-on-surface-variant"
                >
                  {lang === 'bn'
                    ? 'সর্বোচ্চ হাঁটার দূরত্ব'
                    : 'Max walk per stretch'}
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
                  className="min-h-[32px] w-full bg-transparent text-sm font-bold text-on-surface focus:outline-none"
                >
                  <option value={0.5}>0.5 km (500 m)</option>
                  <option value={1}>1 km</option>
                  <option value={1.5}>1.5 km</option>
                  <option value={2}>2 km</option>
                </select>
              </div>

              <div className="rounded-xl bg-surface-container-low px-3.5 py-2.5">
                <label
                  htmlFor="trip-budget"
                  className="mb-1 block text-[11px] font-semibold text-on-surface-variant"
                >
                  {lang === 'bn'
                    ? 'বাজেট (₹, ঐচ্ছিক)'
                    : 'Trip budget (₹, optional)'}
                </label>
                <input
                  id="trip-budget"
                  type="number"
                  min={0}
                  step={5}
                  inputMode="numeric"
                  placeholder="e.g. 50"
                  value={budget}
                  onChange={(e) => onChangeBudget(e.target.value)}
                  className="min-h-[32px] w-full bg-transparent text-sm font-bold text-on-surface tabular-nums placeholder:text-on-surface-variant/60 focus:outline-none"
                />
              </div>
            </div>

            {/* Value-of-Time Slider */}
            <div className="flex flex-col gap-2.5 rounded-xl bg-surface-container-low p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="time-value"
                  className="flex items-center gap-2 text-xs font-bold text-on-surface"
                >
                  <Gauge
                    className="h-4 w-4 text-secondary"
                    aria-hidden="true"
                  />
                  <span>
                    {lang === 'bn'
                      ? 'সময় বনাম খরচ (১০ মিনিটের মূল্য)'
                      : 'Value-of-Time Trade-off (সময় বনাম খরচ)'}
                  </span>
                </label>
                <span className="text-sm font-bold text-primary tabular-nums">
                  {sliderReadout}
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
                className="h-2 w-full cursor-pointer rounded-lg bg-surface-container-highest"
              />

              <div className="flex justify-between text-[11px] font-medium text-on-surface-variant tabular-nums">
                <span>₹0 (Cheapest)</span>
                <span>₹20 (Balanced)</span>
                <span>₹50 (Faster)</span>
                <span>₹100 (Fastest)</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm font-semibold text-error">
                {error}
              </p>
            )}

            {/* Primary CTA */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-on-primary shadow-[var(--shadow-md)] transition-all hover:bg-primary-container active:scale-[0.99]"
              >
                <span>
                  {lang === 'bn'
                    ? 'রুট খুঁজুন (Find routes)'
                    : 'Find routes (রুট খুঁজুন)'}
                </span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>

              {cabSavings !== null && tripResult?.cab && (
                <div className="flex items-center justify-center gap-1.5 text-center text-xs font-bold text-secondary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Save {formatRupee(cabSavings)} vs direct app-cab (
                    {formatRupee(tripResult.cab.fare)}) · Fares are approximate
                  </span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Column (5 Cols): Live Route Preview & Network Grid */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Recommended Lowest Fares (Live from planTrip) */}
          <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] sm:p-5">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Route
                  className="h-5 w-5 text-secondary"
                  aria-hidden="true"
                />
                <h2 className="text-base font-bold text-on-surface">
                  Recommended Lowest Fares
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-on-surface-variant">
                {options.peak ? 'Peak hour' : 'Off-peak'}
              </span>
            </div>

            {tripResult && tripResult.options.length > 0 ? (
              <div className="flex flex-col gap-3">
                {tripResult.options.map((opt) => {
                  const totalLegMin = Math.max(
                    1,
                    opt.legs.reduce((s, l) => s + l.minutes, 0)
                  );
                  const savings = tripResult.cab
                    ? tripResult.cab.fare - opt.totalFare
                    : 0;
                  const labelText = opt.labels.join(' · ');

                  return (
                    <div
                      key={opt.signature}
                      className="flex flex-col gap-2.5 rounded-xl bg-surface-container-low p-3.5 transition-colors hover:bg-surface-container"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-on-secondary tabular-nums">
                              {labelText}: {formatRupee(opt.totalFare)}
                            </span>
                            <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                              {opt.totalMinutes} min
                            </span>
                          </div>
                          <h3 className="truncate text-sm font-bold text-on-surface">
                            {fromName} → {toName}
                          </h3>
                        </div>

                        {tripResult.cab && savings > 0 && (
                          <div className="shrink-0 text-right tabular-nums">
                            <span className="text-[11px] font-medium text-error line-through">
                              Cab: {formatRupee(tripResult.cab.fare)}
                            </span>
                            <div className="text-[11px] font-bold text-secondary">
                              Save {formatRupee(savings)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Proportional segment bar */}
                      <div
                        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-container-highest"
                        aria-hidden="true"
                      >
                        {opt.legs.map((leg, i) => (
                          <span
                            key={`${leg.from}-${leg.to}-${i}`}
                            style={{
                              flex: Math.max(0.05, leg.minutes / totalLegMin),
                              backgroundColor: getLegColor(leg),
                            }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-on-surface-variant">
                        <span className="truncate">{getModeSummary(opt)}</span>
                        <button
                          type="button"
                          onClick={() => onSelectOption(opt.signature)}
                          className="inline-flex shrink-0 items-center gap-0.5 font-bold text-primary hover:underline"
                        >
                          <span>Steps</span>
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={onSubmit}
                  className="mt-1 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
                >
                  <span>Compare All Options in Results</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-surface-container-low p-4 text-xs text-on-surface-variant">
                {error ||
                  'No multi-modal routes found with the current avoid filters. Try allowing more modes or increasing walk distance.'}
              </div>
            )}
          </div>

          {/* Suburban Rail & Metro Grid SVG Card (Data-Driven, Zero External URL) */}
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                <span className="text-sm font-bold text-on-surface">
                  Suburban Rail &amp; Metro Grid
                </span>
              </div>
              <span className="text-[11px] font-semibold text-secondary">
                {network.stops.length} Stops Mapped
              </span>
            </div>

            <div
              className="relative overflow-hidden rounded-xl border border-outline-variant/30 p-3"
              style={{ backgroundColor: 'var(--map-bg)' }}
            >
              {miniNetworkSvg && (
                <svg
                  viewBox={miniNetworkSvg.viewBox}
                  role="img"
                  aria-label="Kolkata and Hooghly Metro, Suburban Rail, and Ferry network overview"
                  className="h-36 w-full"
                >
                  {miniNetworkSvg.lines.map((line) => (
                    <polyline
                      key={line.id}
                      points={line.points}
                      fill="none"
                      stroke={
                        line.mode === 'metro'
                          ? line.colorToken === 'green'
                            ? 'var(--c-green)'
                            : line.colorToken === 'orange'
                              ? 'var(--c-orange)'
                              : line.colorToken === 'purple'
                                ? 'var(--c-purple)'
                                : 'var(--c-blue)'
                          : line.mode === 'ferry'
                            ? 'var(--c-ferry)'
                            : 'var(--c-rail)'
                      }
                      strokeWidth={line.mode === 'metro' ? '2.6' : '1.8'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={
                        line.mode === 'ferry' ? '3 3' : undefined
                      }
                      opacity={0.85}
                    />
                  ))}
                </svg>
              )}

              <div className="mt-2 flex items-center justify-between rounded-lg bg-surface-container-lowest/90 px-3 py-1.5 text-[11px] font-bold shadow-[var(--shadow-sm)]">
                <span className="text-on-surface">
                  Ganga Ghat Ferries Operating
                </span>
                <span className="text-primary tabular-nums">₹6 Flat</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5">
                <span className="text-[11px] font-medium text-on-surface-variant">
                  Blue Line Wait
                </span>
                <span className="text-sm font-bold text-on-surface tabular-nums">
                  ~{network.modes.metro.wait} min
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-surface-container-low p-2.5">
                <span className="text-[11px] font-medium text-on-surface-variant">
                  Local Rail Base
                </span>
                <span className="text-sm font-bold text-secondary tabular-nums">
                  From ₹5
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Strip matching Stitch Plan */}
      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)] md:flex-row md:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-fixed">
            <Wallet className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface sm:text-base">
              Why daily commuters choose Kom Khoroch
            </h3>
            <p className="text-xs text-on-surface-variant sm:text-sm">
              Compares Metro, Local Rail, Buses, Shared Autos &amp; Ferries against peak cab surge fares. Fares are approximate.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToAbout}
          className="min-h-[40px] shrink-0 rounded-lg bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          View Fare Matrix
        </button>
      </div>
    </div>
  );
};
