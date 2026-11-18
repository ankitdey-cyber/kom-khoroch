import React, { useMemo, useState } from 'react';
import type { LangKey, SavedCommute } from '../types';
import {
  STOP_MAP,
  formatRupee,
  getModeSummary,
  planner,
} from '../utils/transit';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  CreditCard,
  Lightbulb,
  Plus,
  Share2,
  Trash2,
  TrendingDown,
} from './Icons';

interface SavedScreenProps {
  saved: SavedCommute[];
  onReplan: (item: SavedCommute) => void;
  onQuickSaveRoute: (entry: SavedCommute) => void;
  onDelete: (id: string) => void;
  onGoToPlan: () => void;
  lang: LangKey;
}

type SavedFilter = 'all' | 'peak' | 'offpeak';

const POPULAR_CORRIDORS: { fromId: string; toId: string; title: string }[] = [
  { fromId: 'HWH', toId: 'SC5', title: 'Howrah Jn → Sector V' },
  { fromId: 'KVS', toId: 'DLP', title: 'Kavi Subhash → BBD Bag' },
  { fromId: 'SRP', toId: 'ESP', title: 'Serampore → Esplanade' },
];

export const SavedScreen: React.FC<SavedScreenProps> = ({
  saved,
  onReplan,
  onQuickSaveRoute,
  onDelete,
  onGoToPlan,
  lang,
}) => {
  const [filter, setFilter] = useState<SavedFilter>('all');
  const [toastMsg, setToastMsg] = useState<string>('');

  const filtered = useMemo(() => {
    if (filter === 'peak') return saved.filter((s) => s.options.peak);
    if (filter === 'offpeak') return saved.filter((s) => !s.options.peak);
    return saved;
  }, [saved, filter]);

  const peakCount = useMemo(
    () => saved.filter((s) => s.options.peak).length,
    [saved]
  );
  const offPeakCount = saved.length - peakCount;

  // Aggregate real estimated savings across saved routes
  const economyStats = useMemo(() => {
    if (saved.length === 0) {
      return { avgFare: 0, monthlySavings: 0, pctSaved: 0 };
    }
    let totalFare = 0;
    let totalMonthlySavings = 0;
    let totalCabMonthly = 0;

    for (const item of saved) {
      totalFare += item.lastFare;
      const res = planner.planTrip(item.fromId, item.toId, item.options);
      if (res.cab) {
        const diff = Math.max(0, res.cab.fare - item.lastFare);
        totalMonthlySavings += diff * 2 * 22;
        totalCabMonthly += res.cab.fare * 2 * 22;
      }
    }

    const avgFare = Math.round(totalFare / saved.length);
    const pctSaved =
      totalCabMonthly > 0
        ? Math.round((totalMonthlySavings / totalCabMonthly) * 100)
        : 0;
    return { avgFare, monthlySavings: totalMonthlySavings, pctSaved };
  }, [saved]);

  const popularPreviews = useMemo(() => {
    return POPULAR_CORRIDORS.map((c) => {
      const res = planner.planTrip(c.fromId, c.toId, {
        peak: true,
        smartCard: false,
        avoid: [],
        maxWalkKm: 1,
        timeValuePer10Min: 20,
      });
      const opt = res.options[0] ?? null;
      return {
        ...c,
        fromName: STOP_MAP[c.fromId]?.name ?? c.fromId,
        toName: STOP_MAP[c.toId]?.name ?? c.toId,
        option: opt,
        alreadySaved: saved.some(
          (s) => s.fromId === c.fromId && s.toId === c.toId
        ),
      };
    });
  }, [saved]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(''), 2600);
  };

  const handleShareSaved = async (item: SavedCommute) => {
    const text = `${item.fromName} → ${item.toName}: ~${formatRupee(item.lastFare)}, ~${item.lastMinutes} min (${item.modeSummary}) — Kom Khoroch`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied saved route to clipboard.');
    } catch {
      showToast('Clipboard blocked by browser.');
    }
  };

  const handleQuickAdd = (p: (typeof popularPreviews)[number]) => {
    if (!p.option) return;
    const entry: SavedCommute = {
      id: `${p.fromId}-${p.toId}-${Date.now()}`,
      fromId: p.fromId,
      fromName: p.fromName,
      toId: p.toId,
      toName: p.toName,
      options: {
        peak: true,
        smartCard: false,
        avoid: [],
        maxWalkKm: 1,
        timeValuePer10Min: 20,
      },
      budget: '',
      lastFare: p.option.totalFare,
      lastMinutes: p.option.totalMinutes,
      modeSummary: getModeSummary(p.option),
      savedAt: Date.now(),
    };
    onQuickSaveRoute(entry);
    showToast(`Saved: ${p.title}`);
  };

  return (
    <div className="flex w-full flex-col pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-end md:py-6">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span>Kom Khoroch</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-primary">My Commutes</span>
            <span className="rounded bg-surface-container-high px-2 py-0.5 text-[11px] font-bold text-secondary">
              আমার সেভ করা রুট
            </span>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
            {lang === 'bn' ? 'সংরক্ষিত যাতায়াত' : 'Saved Commutes'}{' '}
            <span className="text-xl font-bold text-secondary sm:text-2xl">
              {lang === 'bn' ? 'Saved' : 'সংরক্ষিত যাতায়াত'}
            </span>
          </h1>
          <p className="max-w-2xl text-xs text-on-surface-variant sm:text-sm">
            {lang === 'bn'
              ? 'ট্যাপ করে সরাসরি বর্তমান ভাড়া ও সময় দেখুন। ভাড়া আনুমানিক।'
              : 'Quick access to your saved commutes and one-tap re-planning across Kolkata & Hooghly. Fares are approximate.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToPlan}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-1.5 self-start rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-hover md:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add New Route</span>
        </button>
      </div>

      {/* Economy Summary Banner */}
      <div className="relative mb-6 overflow-hidden rounded-xl bg-surface-container-low p-5 shadow-[var(--shadow-sm)] md:p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex max-w-xl flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
              <span>Total Commute Economy · খরচ বাঁচানো হিসেব</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-on-surface tabular-nums sm:text-4xl">
                {saved.length > 0
                  ? formatRupee(economyStats.monthlySavings)
                  : '₹0'}
              </span>
              <span className="text-sm font-bold text-secondary">
                est. monthly savings
              </span>
              <span className="text-xs text-on-surface-variant">
                (vs direct app cabs, 22 days round trip)
              </span>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2.5 lg:w-auto">
            <div className="flex flex-col rounded-lg bg-surface-container-lowest p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[11px] font-medium text-on-surface-variant">
                Saved Routes
              </span>
              <span className="mt-0.5 text-lg font-bold text-on-surface tabular-nums">
                {saved.length}
              </span>
            </div>
            <div className="flex flex-col rounded-lg bg-surface-container-lowest p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[11px] font-medium text-on-surface-variant">
                Avg Trip Fare
              </span>
              <span className="mt-0.5 text-lg font-bold text-primary tabular-nums">
                {saved.length > 0 ? formatRupee(economyStats.avgFare) : '—'}
              </span>
            </div>
            <div className="flex flex-col rounded-lg bg-surface-container-lowest p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[11px] font-medium text-on-surface-variant">
                Cost Reduction
              </span>
              <span className="mt-0.5 text-lg font-bold text-secondary tabular-nums">
                {saved.length > 0 ? `${economyStats.pctSaved}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              filter === 'all'
                ? 'bg-primary text-on-primary shadow-[var(--shadow-sm)]'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            All Saved ({saved.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('peak')}
            className={`min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              filter === 'peak'
                ? 'bg-primary text-on-primary shadow-[var(--shadow-sm)]'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            Peak Hour ({peakCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('offpeak')}
            className={`min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              filter === 'offpeak'
                ? 'bg-primary text-on-primary shadow-[var(--shadow-sm)]'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            Off-Peak ({offPeakCount})
          </button>
        </div>

        {toastMsg && (
          <span
            role="status"
            aria-live="polite"
            className="text-xs font-bold text-secondary"
          >
            {toastMsg}
          </span>
        )}
      </div>

      {/* Main Grid: Saved Cards (8 Cols) + Right Sidebar (4 Cols) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-8 text-center shadow-[var(--shadow-sm)]">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-primary">
                <Bookmark className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="max-w-md text-sm font-bold text-on-surface">
                {saved.length === 0
                  ? "You haven't saved any routes yet. Plan a trip and tap 'Save commute' to keep it here."
                  : 'No saved commutes match this filter.'}
              </p>
              <p className="mt-1 text-xs font-medium text-secondary">
                এখনও কোনো রুট সেভ করা নেই। প্ল্যান পেজে গিয়ে &apos;Save commute&apos; ট্যাপ করুন।
              </p>
              <button
                type="button"
                onClick={onGoToPlan}
                className="mt-5 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-hover"
              >
                <span>Explore Routes on Plan</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            filtered.map((item) => {
              const metaParts = [
                item.options.peak ? 'Peak hour' : 'Off-peak',
                item.options.smartCard ? 'Smart card (-10%)' : null,
                item.options.avoid.length > 0
                  ? `Avoid ${item.options.avoid.join(', ')}`
                  : null,
              ].filter(Boolean);

              return (
                <article
                  key={item.id}
                  className="rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[11px] font-bold text-on-surface">
                        {item.options.peak ? 'Peak Commute' : 'Off-Peak Commute'}
                      </span>
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        {metaParts.join(' · ')}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleShareSaved(item)}
                        aria-label={`Share ${item.fromName} to ${item.toName}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <Share2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        aria-label={`Remove ${item.fromName} to ${item.toName}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">
                        {item.fromName} → {item.toName}
                      </h2>
                      <p className="mt-1 text-xs font-medium text-on-surface-variant">
                        {item.modeSummary}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-2 rounded-lg bg-surface-container-low px-3 py-2 md:flex-col md:items-end md:bg-transparent md:p-0">
                      <span className="font-display text-2xl font-extrabold text-secondary tabular-nums">
                        {formatRupee(item.lastFare)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant tabular-nums">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        ~{item.lastMinutes} min
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-secondary"
                        aria-hidden="true"
                      />
                      <span>Approx. snapshot · tap to recalculate live</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onReplan(item)}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-hover"
                    >
                      <span>Plan now (রুট দেখুন)</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Sidebar: Tips & Quick Save Corridors */}
        <aside className="flex flex-col gap-5 lg:col-span-4">
          <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb
                  className="h-4 w-4 text-secondary"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold text-on-surface">
                  Smart Commuter Tips
                </h2>
              </div>
              <span className="text-[11px] font-bold text-secondary">
                স্মার্ট টিপস
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-on-surface-variant">
              <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-3">
                <CreditCard
                  className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                  aria-hidden="true"
                />
                <div>
                  <strong className="block text-on-surface">
                    Metro Smart Card 10% Discount
                  </strong>
                  <span>
                    Enable Metro smart card in the planner to factor the 10%
                    fare rebate into your totals.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-3">
                <Clock
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <strong className="block text-on-surface">
                    Peak vs Off-Peak Speeds
                  </strong>
                  <span>
                    Toggling Peak hour models slower road speeds for buses,
                    autos, and cabs while keeping rail &amp; metro steady.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Save Popular Kolkata Routes */}
          <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-on-surface">
                Quick Save Corridors
              </h2>
              <span className="text-[11px] text-on-surface-variant">
                1-tap add
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {popularPreviews.map((p) => (
                <div
                  key={p.title}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-on-surface">
                      {p.title}
                    </div>
                    {p.option && (
                      <div className="truncate text-[11px] text-on-surface-variant tabular-nums">
                        {getModeSummary(p.option)} ·{' '}
                        {formatRupee(p.option.totalFare)} ·{' '}
                        {p.option.totalMinutes} min
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={p.alreadySaved || !p.option}
                    onClick={() => handleQuickAdd(p)}
                    className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg bg-surface-container-lowest px-3.5 py-2 text-xs font-bold text-secondary shadow-[var(--shadow-sm)] transition-colors hover:bg-secondary-container hover:text-on-secondary-fixed disabled:opacity-50"
                  >
                    {p.alreadySaved ? 'Saved' : '+ Save'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="px-1 text-center text-[11px] text-on-surface-variant">
            Saved fares are approximate snapshots; tapping Plan now recalculates
            with current slabs.
          </p>
        </aside>
      </div>
    </div>
  );
};
