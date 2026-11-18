import React, { useMemo } from 'react';
import type { LangKey, ModeKey } from '../types';
import {
  formatRupee,
  getModeColor,
  getModeSummary,
  network,
  planner,
} from '../utils/transit';
import {
  CheckCircle2,
  ChevronDown,
  Gauge,
  HelpCircle,
  IndianRupee,
  ModeIcon,
  Route,
  TrendingDown,
} from './Icons';

interface AboutScreenProps {
  lang: LangKey;
  onSetLang: (lang: LangKey) => void;
}

const MODE_ORDER: ModeKey[] = [
  'metro',
  'rail',
  'bus',
  'auto',
  'ferry',
  'bike',
  'cab',
  'walk',
];

export const AboutScreen: React.FC<AboutScreenProps> = ({ lang, onSetLang }) => {
  const benchmark = useMemo(() => {
    const res = planner.planTrip('HWH', 'SC5', {
      peak: true,
      smartCard: false,
      avoid: [],
      maxWalkKm: 1,
      timeValuePer10Min: 20,
    });
    const cheapest = res.options[0] ?? null;
    const cab = res.cab;
    const pctSaved =
      cheapest && cab && cab.fare > 0
        ? Math.round(((cab.fare - cheapest.totalFare) / cab.fare) * 100)
        : 0;
    return { cheapest, cab, pctSaved };
  }, []);

  return (
    <div className="flex w-full flex-col pb-12">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
          <span className="font-bold text-primary">Kom Khoroch</span>
          <span aria-hidden="true">›</span>
          <span>About the Project</span>
          <span className="hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden font-bold text-secondary sm:inline">
            প্রকল্প পরিচিতি
          </span>
        </div>

        <span className="rounded-full bg-secondary-container/50 px-3 py-1 text-[11px] font-bold text-on-secondary-fixed-variant">
          Fares are approximate
        </span>
      </div>

      {/* Hero Header with Bilingual Switcher & 4 Quick Stats */}
      <section className="relative mb-8 overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-[var(--shadow-sm)] md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex max-w-3xl flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary-fixed px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-primary-fixed">
                Lowest-Fare Routing
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                Kolkata · Howrah · Hooghly · South 24 Pgs
              </span>
            </div>

            <h1 className="font-display text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
              About Kom Khoroch
              <span className="mt-1 block text-2xl font-bold text-primary sm:text-3xl">
                কম খরচ সম্পর্কে
              </span>
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
              {lang === 'bn'
                ? 'কম খরচ কলকাতা ও হুগলির যাত্রীদের জন্য একটি বাজেট-বান্ধব রুট প্ল্যানার। মেট্রো, লোকাল ট্রেন, বাস, শেয়ার অটো এবং গঙ্গা ফেরি একসাথে তুলনা করে সবচেয়ে সাশ্রয়ী পথ দেখায়।'
                : 'Kom Khoroch is a budget-first commute planner for Greater Kolkata and Hooghly. We unify Metro lines, Eastern Railway suburban locals, buses, shared autos, and Ganga ferries into one city graph so daily riders avoid cab surge prices.'}
            </p>
          </div>

          {/* Language Toggle Box */}
          <div className="flex shrink-0 flex-col items-start gap-1.5 rounded-xl bg-surface-container-low p-2 md:items-end">
            <span className="px-1 text-[11px] font-medium text-on-surface-variant">
              Dual Script / ভাষা বদল
            </span>
            <div className="flex items-center rounded-lg bg-surface-container-lowest p-1 shadow-[var(--shadow-sm)]">
              <button
                type="button"
                onClick={() => onSetLang('en')}
                className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  lang === 'en'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onSetLang('bn')}
                className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  lang === 'bn'
                    ? 'bg-secondary text-on-secondary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="-mx-6 -mb-6 mt-8 grid grid-cols-2 gap-4 bg-surface-container-low/70 px-6 py-5 sm:grid-cols-4 md:-mx-8 md:-mb-8 md:px-8">
          <div className="flex flex-col">
            <span className="font-display text-2xl font-extrabold text-secondary tabular-nums">
              ₹5.00
            </span>
            <span className="text-xs font-medium text-on-surface-variant">
              Starting Local Rail Fare
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl font-extrabold text-primary tabular-nums">
              {Object.keys(network.modes).length} Modes
            </span>
            <span className="text-xs font-medium text-on-surface-variant">
              Unified Into One Graph
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl font-extrabold text-on-surface tabular-nums">
              {network.stops.length} Stops
            </span>
            <span className="text-xs font-medium text-on-surface-variant">
              {network.lines.length} Transit Lines Mapped
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl font-extrabold text-secondary tabular-nums">
              ₹6.00
            </span>
            <span className="text-xs font-medium text-on-surface-variant">
              Flat River Ghat Crossing
            </span>
          </div>
        </div>
      </section>

      {/* How It Works (3 Cards) */}
      <section className="mb-8">
        <div className="mb-5 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Routing Architecture
          </span>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-on-surface">
            How It Works{' '}
            <span className="font-normal text-on-surface-variant">
              | যেভাবে কাজ করে
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container/60 text-secondary">
                <Route className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  01 · ইন্টারলিঙ্ক
                </span>
                <h3 className="mt-0.5 text-lg font-bold text-on-surface">
                  One City Graph
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                All modes share common stations and hubs so interchanges like
                Howrah Rail to Green Line Metro or Dakshineswar Rail to Blue
                Metro connect naturally with walking transfers.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed/60 text-primary">
                <IndianRupee className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  02 · খরচ বনাম সময়
                </span>
                <h3 className="mt-0.5 text-lg font-bold text-on-surface">
                  Cheapest vs Fastest
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                Dijkstra routing weighs rupee fare plus your chosen value of
                time and a boarding penalty per transfer, producing Cheapest,
                Smart pick, and Fastest options side-by-side.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                <Gauge className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                  03 · নিজস্ব নিয়ন্ত্রণ
                </span>
                <h3 className="mt-0.5 text-lg font-bold text-on-surface">
                  Your Time Value
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                Slide between ₹0/10 min (strictly lowest fare) and ₹100/10 min
                (rapid arrival). Consecutive walking legs are disallowed to keep
                transfers practical.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Benchmark Comparison */}
      {benchmark.cheapest && benchmark.cab && (
        <section className="mb-8 rounded-2xl bg-surface-container-lowest p-6 shadow-[var(--shadow-sm)] md:p-8">
          <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
            <div className="flex w-full flex-col gap-3 lg:w-1/2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
                <TrendingDown className="h-4 w-4" aria-hidden="true" />
                <span>Live Benchmark: Howrah Jn → Salt Lake Sector V</span>
              </span>
              <h3 className="text-xl font-extrabold text-on-surface sm:text-2xl">
                Real-World Commute Comparison
              </h3>
              <p className="text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                Calculated live by the routing engine for peak hour travel
                between Howrah Jn and Salt Lake Sector V:
              </p>

              <div className="rounded-xl bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-secondary sm:text-sm">
                    Kom Khoroch ({getModeSummary(benchmark.cheapest)})
                  </span>
                  <span className="text-lg font-extrabold text-secondary tabular-nums">
                    {formatRupee(benchmark.cheapest.totalFare)}
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  ~{benchmark.cheapest.totalMinutes} min ·{' '}
                  {benchmark.cheapest.rides}{' '}
                  {benchmark.cheapest.rides === 1 ? 'ride' : 'rides'}
                </span>
              </div>

              <div className="rounded-xl bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-error sm:text-sm">
                    Peak App Cab Estimate
                  </span>
                  <span className="text-lg font-extrabold text-error tabular-nums">
                    {formatRupee(benchmark.cab.fare)}
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  ~{benchmark.cab.minutes} min · subject to road traffic &amp;
                  peak multiplier
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 rounded-xl bg-surface-container-low p-5 lg:w-1/2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-surface">
                  Fare Comparison Bar
                </span>
                <span className="rounded bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-fixed">
                  Save {benchmark.pctSaved}%
                </span>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className="text-on-surface">
                    {getModeSummary(benchmark.cheapest)}
                  </span>
                  <span className="font-bold text-secondary tabular-nums">
                    {formatRupee(benchmark.cheapest.totalFare)} |{' '}
                    {benchmark.cheapest.totalMinutes} min
                  </span>
                </div>
                <div className="h-3.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{
                      width: `${Math.max(
                        6,
                        Math.round(
                          (benchmark.cheapest.totalFare /
                            Math.max(1, benchmark.cab.fare)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className="text-on-surface">App Cab (Peak Surge)</span>
                  <span className="font-bold text-error tabular-nums">
                    {formatRupee(benchmark.cab.fare)} | {benchmark.cab.minutes}{' '}
                    min
                  </span>
                </div>
                <div className="h-3.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div className="h-full w-full rounded-full bg-error" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-on-surface-variant">
                <span>Computed directly from network.json &amp; routing.js</span>
                <span className="font-bold text-secondary">
                  Fares are approximate
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Fare Table by Mode (from network.modes & network.fareNotes) */}
      <section className="mb-8">
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
              Network Tariffs
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-on-surface">
              {lang === 'bn'
                ? 'যানবাহন অনুযায়ী ভাড়ার তালিকা'
                : 'Fare Table by Mode'}{' '}
              <span className="font-normal text-on-surface-variant">
                {lang === 'bn'
                  ? '| Fare Table'
                  : '| যানবাহন অনুযায়ী ভাড়ার তালিকা'}
              </span>
            </h2>
          </div>
          <span className="text-xs font-bold text-error">
            Fares are approximate · {network.note}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODE_ORDER.map((modeKey) => {
            const cfg = network.modes[modeKey];
            const note = network.fareNotes[modeKey];
            const color = getModeColor(modeKey);
            const isWalk = modeKey === 'walk';

            return (
              <div
                key={modeKey}
                className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-sm)]"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isWalk ? 'border-2 border-dashed' : 'text-white'
                        }`}
                        style={
                          isWalk
                            ? { borderColor: color, color }
                            : { backgroundColor: color }
                        }
                      >
                        <ModeIcon mode={modeKey} className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">
                          {cfg.label}
                        </h3>
                        <span className="text-[11px] font-semibold text-on-surface-variant tabular-nums">
                          Tag: {cfg.tag}
                        </span>
                      </div>
                    </div>

                    <span className="rounded bg-surface-container-high px-2 py-0.5 text-[11px] font-bold text-on-surface tabular-nums">
                      {cfg.speed}
                      {cfg.peak ? `/${cfg.peak}` : ''} km/h
                    </span>
                  </div>

                  <p className="rounded-lg bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface">
                    {note}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-on-surface-variant tabular-nums">
                  <span>Avg wait: {cfg.wait} min</span>
                  <span>Detour factor: ×{cfg.detour}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Commuter FAQ & Disclaimer */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-6 shadow-[var(--shadow-sm)] lg:col-span-2">
          <div>
            <h3 className="mb-2 text-lg font-extrabold text-on-surface">
              Built for Kolkata, Howrah &amp; Hooghly Commuters
            </h3>
            <p className="mb-3 text-xs leading-relaxed text-on-surface-variant sm:text-sm">
              Daily commuters often default to expensive cab rides because main
              mapping tools do not surface low-fare multi-modal hops across
              suburban rail, underground metro stations, buses, shared autos,
              and Ganga ferry ghats.
            </p>
            <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-3.5 text-xs text-on-surface">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-secondary"
                  aria-hidden="true"
                />
                <span>
                  <strong>Disclaimer:</strong> Fares are approximate. Always check
                  official railway, metro, or operator counters before travel.
                </span>
              </div>
              <p className="pl-6 font-semibold text-secondary">
                Your location stays on your phone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2">
            <HelpCircle
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-on-surface">Commuter FAQ</h3>
          </div>

          <details className="group rounded-xl bg-surface-container-low p-3 text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-on-surface">
              <span>Does it model walking transfers?</span>
              <ChevronDown
                className="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-2 leading-relaxed text-on-surface-variant">
              Yes. Walking edges connect nearby stops up to your Max walk
              setting (0.5 to 2 km), while avoiding consecutive walks.
            </p>
          </details>

          <details className="group rounded-xl bg-surface-container-low p-3 text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-on-surface">
              <span>How does the Time Value slider work?</span>
              <ChevronDown
                className="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-2 leading-relaxed text-on-surface-variant">
              Set what saving 10 minutes is worth to you in rupees (₹0–₹100) to
              tune the Smart pick route between lowest fare and fastest arrival.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
};
