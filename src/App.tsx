import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { PlanForm } from './components/PlanForm';
import { ResultsScreen } from './components/ResultsScreen';
import { RouteDetail } from './components/RouteDetail';
import { SavedScreen } from './components/SavedScreen';
import type {
  GpsOrigin,
  LangKey,
  PlanTripResult,
  RouteOption,
  SavedCommute,
  TabKey,
  ThemeKey,
  TripOptions,
} from './types';
import {
  STOP_MAP,
  formatKm,
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

type PlanSubView = 'plan' | 'results' | 'detail';

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

function optionsMatch(a: TripOptions, b: TripOptions): boolean {
  return (
    a.peak === b.peak &&
    a.smartCard === b.smartCard &&
    a.maxWalkKm === b.maxWalkKm &&
    a.timeValuePer10Min === b.timeValuePer10Min &&
    a.avoid.join(',') === b.avoid.join(',')
  );
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('plan');
  const [planSubView, setPlanSubView] = useState<PlanSubView>('plan');
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

  // In-memory only: never persisted to localStorage or sent to any server
  const [gpsOrigin, setGpsOrigin] = useState<GpsOrigin | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locateRequestIdRef = useRef<number>(0);
  const preLocateFromRef = useRef<string>('Serampore');

  const [savedCommutes, setSavedCommutes] = useState<SavedCommute[]>(() =>
    loadSavedCommutes()
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('kom_khoroch_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const usingGps = Boolean(
    gpsOrigin && fromText === gpsOrigin.displayLabel
  );

  const handleChangeFrom = (nextValue: string) => {
    locateRequestIdRef.current += 1;
    setIsLocating(false);
    setLocationError(null);
    setGpsOrigin(null);
    setFromText(nextValue);
  };

  const requestCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError("Couldn't get your location. Type a stop instead.");
      return;
    }

    const reqId = ++locateRequestIdRef.current;
    const prevFrom =
      fromText === 'Finding you...' ? preLocateFromRef.current : fromText;
    preLocateFromRef.current = prevFrom;

    setIsLocating(true);
    setLocationError(null);
    setFromText('Finding you...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (locateRequestIdRef.current !== reqId) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        const nearest = planner.findNearestStops(lat, lng, 3);
        setIsLocating(false);

        if (!nearest.length || nearest[0].km > 30) {
          setGpsOrigin(null);
          setFromText(prevFrom);
          setLocationError("You're outside our Kolkata area");
          return;
        }

        const top = nearest[0];
        const displayLabel = `My location (near ${top.name}, ${formatKm(top.km)})`;
        setGpsOrigin({
          lat,
          lng,
          nearestStopId: top.id,
          nearestStopName: top.name,
          distanceKm: top.km,
          displayLabel,
        });
        setFromText(displayLabel);
        setSelectedSignature(null);
      },
      (err) => {
        if (locateRequestIdRef.current !== reqId) return;
        setIsLocating(false);
        setGpsOrigin(null);
        setFromText(prevFrom);

        if (err && err.code === 1) {
          setLocationError(
            'Location blocked. Allow it in browser settings or type a stop.'
          );
        } else {
          setLocationError("Couldn't get your location. Type a stop instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resolvedStops = useMemo(() => {
    const fromId = usingGps ? 'ME' : planner.findStop(fromText);
    const toId = planner.findStop(toText);
    return { fromId, toId };
  }, [fromText, toText, usingGps]);

  const { error, tripResult } = useMemo<{
    error: string | null;
    tripResult: PlanTripResult | null;
  }>(() => {
    if (isLocating && fromText === 'Finding you...') {
      return { error: null, tripResult: null };
    }

    const { fromId, toId } = resolvedStops;

    if (usingGps && gpsOrigin) {
      if (!toId) {
        return {
          error: toText.trim()
            ? `Couldn't find "${toText}". Pick a stop or place from the suggestions.`
            : 'Enter a destination.',
          tripResult: null,
        };
      }
      const result = planner.planTrip(
        { lat: gpsOrigin.lat, lng: gpsOrigin.lng },
        toId,
        options
      );
      if (result.outsideArea) {
        return {
          error: result.error ?? "You're outside our Kolkata area",
          tripResult: null,
        };
      }
      return { error: null, tripResult: result };
    }

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
  }, [
    isLocating,
    resolvedStops,
    usingGps,
    gpsOrigin,
    fromText,
    toText,
    options,
  ]);

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

  const fromName =
    usingGps && gpsOrigin
      ? gpsOrigin.displayLabel
      : resolvedStops.fromId
        ? STOP_MAP[resolvedStops.fromId]?.name ?? fromText
        : fromText;
  const toName = resolvedStops.toId
    ? STOP_MAP[resolvedStops.toId]?.name ?? toText
    : toText;

  // Never persist GPS coordinates in localStorage: map GPS origin to nearest stop ID
  const saveFromId =
    usingGps && gpsOrigin ? gpsOrigin.nearestStopId : resolvedStops.fromId;
  const saveFromName =
    usingGps && gpsOrigin ? gpsOrigin.nearestStopName : fromName;

  const findSavedMatch = (opt: RouteOption | null): SavedCommute | null => {
    if (!saveFromId || !resolvedStops.toId || !opt) return null;
    const summary = getModeSummary(opt);
    return (
      savedCommutes.find(
        (s) =>
          s.fromId === saveFromId &&
          s.toId === resolvedStops.toId &&
          optionsMatch(s.options, options) &&
          s.modeSummary === summary
      ) ?? null
    );
  };

  const savedSignatureSet = useMemo(() => {
    const set = new Set<string>();
    if (!tripResult || !saveFromId || !resolvedStops.toId) return set;
    for (const opt of tripResult.options) {
      const summary = getModeSummary(opt);
      const matched = savedCommutes.some(
        (s) =>
          s.fromId === saveFromId &&
          s.toId === resolvedStops.toId &&
          optionsMatch(s.options, options) &&
          s.modeSummary === summary
      );
      if (matched) set.add(opt.signature);
    }
    return set;
  }, [tripResult, savedCommutes, saveFromId, resolvedStops.toId, options]);

  const handleToggleSaveOption = (opt: RouteOption) => {
    if (!saveFromId || !resolvedStops.toId) return;
    const existing = findSavedMatch(opt);
    if (existing) {
      const next = savedCommutes.filter((s) => s.id !== existing.id);
      setSavedCommutes(next);
      persistSavedCommutes(next);
      return;
    }

    const newEntry: SavedCommute = {
      id: `${saveFromId}-${resolvedStops.toId}-${Date.now()}`,
      fromId: saveFromId,
      fromName: saveFromName,
      toId: resolvedStops.toId,
      toName,
      options: { ...options, avoid: [...options.avoid] },
      budget,
      lastFare: opt.totalFare,
      lastMinutes: opt.totalMinutes,
      modeSummary: getModeSummary(opt),
      savedAt: Date.now(),
    };
    const next = [newEntry, ...savedCommutes];
    setSavedCommutes(next);
    persistSavedCommutes(next);
  };

  const handleQuickSaveRoute = (entry: SavedCommute) => {
    const exists = savedCommutes.some(
      (s) =>
        s.fromId === entry.fromId &&
        s.toId === entry.toId &&
        optionsMatch(s.options, entry.options) &&
        s.modeSummary === entry.modeSummary
    );
    if (exists) return;
    const next = [entry, ...savedCommutes];
    setSavedCommutes(next);
    persistSavedCommutes(next);
  };

  const handleSwap = () => {
    locateRequestIdRef.current += 1;
    setIsLocating(false);
    setLocationError(null);
    if (usingGps && gpsOrigin) {
      setFromText(toText);
      setToText(gpsOrigin.nearestStopName);
      setGpsOrigin(null);
      return;
    }
    setGpsOrigin(null);
    setFromText(toText);
    setToText(fromText);
  };

  const handleFindRoutes = () => {
    if (error || isLocating) return;
    setPlanSubView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOption = (signature: string) => {
    setSelectedSignature(signature);
    setPlanSubView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReplanSaved = (item: SavedCommute) => {
    locateRequestIdRef.current += 1;
    setIsLocating(false);
    setLocationError(null);
    setGpsOrigin(null);
    setFromText(STOP_MAP[item.fromId]?.name ?? item.fromName);
    setToText(STOP_MAP[item.toId]?.name ?? item.toName);
    setOptions({ ...item.options, avoid: [...item.options.avoid] });
    setBudget(item.budget);
    setSelectedSignature(null);
    setActiveTab('plan');
    setPlanSubView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSaved = (id: string) => {
    const next = savedCommutes.filter((item) => item.id !== id);
    setSavedCommutes(next);
    persistSavedCommutes(next);
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'plan') {
      setPlanSubView('plan');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeIsSaved = activeOption
    ? savedSignatureSet.has(activeOption.signature)
    : false;

  const activeOriginPoint =
    usingGps && gpsOrigin
      ? { lat: gpsOrigin.lat, lng: gpsOrigin.lng }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Header
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
        lang={lang}
        onSetLang={setLang}
        savedCount={savedCommutes.length}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 md:px-6 lg:px-10">
        {activeTab === 'plan' && planSubView === 'plan' && (
          <PlanForm
            fromText={fromText}
            toText={toText}
            fromName={fromName}
            toName={toName}
            onChangeFrom={handleChangeFrom}
            onChangeTo={setToText}
            onSwap={handleSwap}
            options={options}
            onChangeOptions={setOptions}
            budget={budget}
            onChangeBudget={setBudget}
            stops={network.stops}
            error={error}
            tripResult={tripResult}
            onSubmit={handleFindRoutes}
            onSelectOption={handleSelectOption}
            onGoToAbout={() => handleTabChange('about')}
            onUseMyLocation={requestCurrentLocation}
            isLocating={isLocating}
            locationError={locationError}
            lang={lang}
          />
        )}

        {activeTab === 'plan' && planSubView === 'results' && (
          <ResultsScreen
            fromName={fromName}
            toName={toName}
            options={options}
            onChangeOptions={setOptions}
            tripResult={tripResult}
            budgetAmount={budgetAmount}
            selectedSignature={activeOption?.signature ?? null}
            savedSignatureSet={savedSignatureSet}
            onSelectOption={handleSelectOption}
            onSaveOption={handleToggleSaveOption}
            onBackToPlan={() => {
              setPlanSubView('plan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUseMyLocation={requestCurrentLocation}
            isLocating={isLocating}
            locationError={locationError}
            lang={lang}
          />
        )}

        {activeTab === 'plan' &&
          planSubView === 'detail' &&
          activeOption && (
            <RouteDetail
              fromName={fromName}
              toName={toName}
              option={activeOption}
              cab={tripResult?.cab ?? null}
              originPoint={activeOriginPoint}
              isSaved={activeIsSaved}
              onSave={() => handleToggleSaveOption(activeOption)}
              onBack={() => {
                setPlanSubView('results');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              lang={lang}
            />
          )}

        {activeTab === 'saved' && (
          <SavedScreen
            saved={savedCommutes}
            onReplan={handleReplanSaved}
            onQuickSaveRoute={handleQuickSaveRoute}
            onDelete={handleDeleteSaved}
            onGoToPlan={() => handleTabChange('plan')}
            lang={lang}
          />
        )}

        {activeTab === 'about' && (
          <AboutScreen lang={lang} onSetLang={setLang} />
        )}
      </main>

      <Footer onSelectTab={handleTabChange} lang={lang} />

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
