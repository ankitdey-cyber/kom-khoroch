import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { OptionCard } from './components/OptionCard';
import { PlanForm } from './components/PlanForm';
import { RouteDetail } from './components/RouteDetail';
import { SavedScreen } from './components/SavedScreen';
import type {
  LangKey,
  PlanTripResult,
  SavedCommute,
  TabKey,
  ThemeKey,
  TripOptions,
} from './types';
import {
  STOP_MAP,
  getModeSummary,
  loadSavedCommutes,
  network,
  persistSavedCommutes,
  planner,
} from './utils/transit';

const DEFAULT_OPTIONS: TripOptions = {
  peak: true,
  smartCard: false,
  avoid: [],
  maxWalkKm: 1,
  timeValuePer10Min: 20,
};

function getInitialTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem('kom_khoroch_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [mobileDetailOpen, setMobileDetailOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeKey>(getInitialTheme);
  const [lang, setLang] = useState<LangKey>('en');

  // Default example on first load: Serampore to Salt Lake Sector V, peak hour on
  const [fromText, setFromText] = useState<string>('Serampore');
  const [toText, setToText] = useState<string>('Salt Lake Sector V');
  const [options, setOptions] = useState<TripOptions>(DEFAULT_OPTIONS);
  const [budget, setBudget] = useState<string>('');
  const [selectedSignature, setSelectedSignature] = useState<string | null>(
    null
  );

  const [savedCommutes, setSavedCommutes] = useState<SavedCommute[]>(() =>
    loadSavedCommutes()
  );

  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('kom_khoroch_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const resolvedStops = useMemo(() => {
    const fromId = planner.findStop(fromText);
    const toId = planner.findStop(toText);
    return { fromId, toId };
  }, [fromText, toText]);

  const { error, tripResult } = useMemo<{
    error: string | null;
    tripResult: PlanTripResult | null;
  }>(() => {
    const { fromId, toId } = resolvedStops;
    if (!fromId || !toId) {
      const missing = !fromId ? fromText : toText;
      return {
        error: missing.trim()
          ? `Couldn't find "${missing}". Pick a stop or place from the suggestions.`
          : 'Enter both a starting stop and a destination.',
        tripResult: null,
      };
    }
    if (fromId === toId) {
      return {
        error: 'From and To are the same place. Choose a different destination.',
        tripResult: null,
      };
    }
    const result = planner.planTrip(fromId, toId, options);
    return { error: null, tripResult: result };
  }, [resolvedStops, fromText, toText, options]);

  const budgetAmount = useMemo(() => {
    if (budget.trim() === '') return null;
    const n = Number(budget);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [budget]);

  const activeOption = useMemo(() => {
    if (!tripResult || tripResult.options.length === 0) return null;
    if (selectedSignature) {
      const found = tripResult.options.find(
        (o) => o.signature === selectedSignature
      );
      if (found) return found;
    }
    return (
      tripResult.options.find((o) => o.labels.includes('Smart pick')) ??
      tripResult.options[0]
    );
  }, [tripResult, selectedSignature]);

  const handleSwap = () => {
    setFromText(toText);
    setToText(fromText);
    setMobileDetailOpen(false);
  };

  const handleFindRoutes = () => {
    setMobileDetailOpen(false);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectOption = (signature: string) => {
    setSelectedSignature(signature);
    setMobileDetailOpen(true);
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fromName = resolvedStops.fromId
    ? STOP_MAP[resolvedStops.fromId]?.name ?? fromText
    : fromText;
  const toName = resolvedStops.toId
    ? STOP_MAP[resolvedStops.toId]?.name ?? toText
    : toText;

  const currentSavedId = useMemo(() => {
    if (!resolvedStops.fromId || !resolvedStops.toId || !activeOption) {
      return null;
    }
    const found = savedCommutes.find(
      (s) =>
        s.fromId === resolvedStops.fromId &&
        s.toId === resolvedStops.toId &&
        s.options.peak === options.peak &&
        s.options.smartCard === options.smartCard &&
        s.options.maxWalkKm === options.maxWalkKm &&
        s.options.timeValuePer10Min === options.timeValuePer10Min &&
        s.options.avoid.join(',') === options.avoid.join(',')
    );
    return found?.id ?? null;
  }, [savedCommutes, resolvedStops, activeOption, options]);

  const handleToggleSaveCurrent = () => {
    if (!resolvedStops.fromId || !resolvedStops.toId || !activeOption) return;

    if (currentSavedId) {
      const next = savedCommutes.filter((s) => s.id !== currentSavedId);
      setSavedCommutes(next);
      persistSavedCommutes(next);
      return;
    }

    const newEntry: SavedCommute = {
      id: `${resolvedStops.fromId}-${resolvedStops.toId}-${Date.now()}`,
      fromId: resolvedStops.fromId,
      fromName,
      toId: resolvedStops.toId,
      toName,
      options: { ...options, avoid: [...options.avoid] },
      budget,
      lastFare: activeOption.totalFare,
      lastMinutes: activeOption.totalMinutes,
      modeSummary: getModeSummary(activeOption),
      savedAt: Date.now(),
    };

    const next = [newEntry, ...savedCommutes];
    setSavedCommutes(next);
    persistSavedCommutes(next);
  };

  const handleReplanSaved = (item: SavedCommute) => {
    setFromText(STOP_MAP[item.fromId]?.name ?? item.fromName);
    setToText(STOP_MAP[item.toId]?.name ?? item.toName);
    setOptions({ ...item.options, avoid: [...item.options.avoid] });
    setBudget(item.budget);
    setSelectedSignature(null);
    setActiveTab('plan');
    setMobileDetailOpen(false);
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleDeleteSaved = (id: string) => {
    const next = savedCommutes.filter((item) => item.id !== id);
    setSavedCommutes(next);
    persistSavedCommutes(next);
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'plan') {
      setMobileDetailOpen(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'bn' : 'en'))}
        savedCount={savedCommutes.length}
      />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:pb-12">
        {activeTab === 'plan' && (
          <>
            {/* Mobile single-column Route Detail screen when an option is tapped */}
            {mobileDetailOpen && activeOption ? (
              <div className="lg:hidden">
                <RouteDetail
                  fromName={fromName}
                  toName={toName}
                  option={activeOption}
                  cab={tripResult?.cab ?? null}
                  isSaved={currentSavedId !== null}
                  onSave={handleToggleSaveCurrent}
                  onBack={() => setMobileDetailOpen(false)}
                  lang={lang}
                />
              </div>
            ) : null}

            {/* Responsive layout: single column on mobile (hidden when detail open), 2-column on desktop */}
            <div
              className={`grid gap-6 lg:grid-cols-[400px_1fr] lg:items-start ${
                mobileDetailOpen && activeOption ? 'hidden lg:grid' : 'grid'
              }`}
            >
              <div className="grid gap-5">
                <PlanForm
                  fromText={fromText}
                  toText={toText}
                  onChangeFrom={setFromText}
                  onChangeTo={setToText}
                  onSwap={handleSwap}
                  options={options}
                  onChangeOptions={setOptions}
                  budget={budget}
                  onChangeBudget={setBudget}
                  stops={network.stops}
                  error={error}
                  onSubmit={handleFindRoutes}
                  lang={lang}
                />

                {/* Results list sits directly below PlanForm on mobile and in left rail or stacked cleanly */}
                <section
                  ref={resultsRef}
                  aria-label="Route results"
                  className="grid gap-3 scroll-mt-20"
                >
                  {tripResult && tripResult.options.length > 0 && (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
                        <h2 className="font-display text-base font-extrabold text-ink">
                          {fromName} → {toName}
                        </h2>
                        <span className="text-xs text-muted">
                          {options.peak ? 'Peak hour' : 'Off-peak'} · Fares are
                          approximate
                        </span>
                      </div>

                      <div className="grid gap-2.5">
                        {tripResult.options.map((opt) => (
                          <OptionCard
                            key={opt.signature}
                            option={opt}
                            selected={activeOption?.signature === opt.signature}
                            cab={tripResult.cab}
                            budgetAmount={budgetAmount}
                            onSelect={() => handleSelectOption(opt.signature)}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {tripResult && tripResult.options.length === 0 && (
                    <div className="rounded-[12px] border border-rule bg-surface p-4 text-sm text-ink">
                      <strong>No route found.</strong>{' '}
                      <span className="text-muted">
                        Allow more transport modes or increase your maximum walk
                        distance and try again.
                      </span>
                    </div>
                  )}
                </section>
              </div>

              {/* Desktop persistent Route Detail panel alongside planner & results */}
              <div className="hidden lg:sticky lg:top-20 lg:block">
                {activeOption ? (
                  <RouteDetail
                    fromName={fromName}
                    toName={toName}
                    option={activeOption}
                    cab={tripResult?.cab ?? null}
                    isSaved={currentSavedId !== null}
                    onSave={handleToggleSaveCurrent}
                    onBack={() => setMobileDetailOpen(false)}
                    showBackButton={false}
                    lang={lang}
                  />
                ) : (
                  <div className="rounded-[12px] border border-rule bg-surface p-6 text-sm text-muted">
                    Select valid starting and destination stops to inspect the
                    step-by-step itinerary and schematic transit map.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'saved' && (
          <SavedScreen
            saved={savedCommutes}
            onReplan={handleReplanSaved}
            onDelete={handleDeleteSaved}
            onGoToPlan={() => handleTabChange('plan')}
            lang={lang}
          />
        )}

        {activeTab === 'about' && <AboutScreen lang={lang} />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        savedCount={savedCommutes.length}
        lang={lang}
      />
    </div>
  );
};

export default App;
