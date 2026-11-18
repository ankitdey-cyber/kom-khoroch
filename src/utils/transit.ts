import networkJson from '../../data/network.json';
import { createPlanner } from '../routing.js';
import type {
  AvoidableMode,
  ModeKey,
  NetworkData,
  RouteLeg,
  RouteOption,
  SavedCommute,
  Stop,
  TransitLine,
} from '../types';

export const network = networkJson as NetworkData;
export const planner = createPlanner(network);

export const STOP_MAP: Record<string, Stop> = Object.fromEntries(
  network.stops.map((s) => [s.id, s])
);

export const LINE_MAP: Record<string, TransitLine> = Object.fromEntries(
  network.lines.map((l) => [l.id, l])
);

export const FREQUENT_STOPS: { id: string; label: string }[] = [
  { id: 'HWH', label: 'Howrah Jn' },
  { id: 'SDH', label: 'Sealdah' },
  { id: 'ESP', label: 'Esplanade' },
  { id: 'SC5', label: 'Sector V' },
  { id: 'APT', label: 'Airport' },
];

export const AVOID_MODES: { key: AvoidableMode; label: string; bn: string }[] = [
  { key: 'cab', label: 'Cab', bn: 'ক্যাব' },
  { key: 'bike', label: 'Bike taxi', bn: 'বাইক' },
  { key: 'bus', label: 'Bus', bn: 'বাস' },
  { key: 'auto', label: 'Auto', bn: 'অটো' },
  { key: 'ferry', label: 'Ferry', bn: 'ফেরি' },
];

const TOKEN_TO_CSS_VAR: Record<string, string> = {
  blue: 'var(--c-blue)',
  green: 'var(--c-green)',
  purple: 'var(--c-purple)',
  orange: 'var(--c-orange)',
  yellow: 'var(--c-yellow)',
  rail: 'var(--c-rail)',
  bus: 'var(--c-bus)',
  auto: 'var(--c-auto)',
  ferry: 'var(--c-ferry)',
};

const MODE_TO_CSS_VAR: Record<ModeKey, string> = {
  metro: 'var(--c-blue)',
  rail: 'var(--c-rail)',
  bus: 'var(--c-bus)',
  auto: 'var(--c-auto)',
  cab: 'var(--c-cab)',
  bike: 'var(--c-bike)',
  ferry: 'var(--c-ferry)',
  walk: 'var(--c-walk)',
};

const TOKEN_TO_ON_CSS_VAR: Record<string, string> = {
  blue: 'var(--c-on-blue)',
  green: 'var(--c-on-green)',
  purple: 'var(--c-on-purple)',
  orange: 'var(--c-on-orange)',
  yellow: 'var(--c-on-yellow)',
  rail: 'var(--c-on-rail)',
  bus: 'var(--c-on-bus)',
  auto: 'var(--c-on-auto)',
  ferry: 'var(--c-on-ferry)',
};

const MODE_TO_ON_CSS_VAR: Record<ModeKey, string> = {
  metro: 'var(--c-on-blue)',
  rail: 'var(--c-on-rail)',
  bus: 'var(--c-on-bus)',
  auto: 'var(--c-on-auto)',
  cab: 'var(--c-on-cab)',
  bike: 'var(--c-on-bike)',
  ferry: 'var(--c-on-ferry)',
  walk: 'var(--c-on-walk)',
};

export function getLegColor(leg: RouteLeg): string {
  if (leg.lineId && LINE_MAP[leg.lineId]) {
    const token = LINE_MAP[leg.lineId].colorToken;
    if (TOKEN_TO_CSS_VAR[token]) return TOKEN_TO_CSS_VAR[token];
  }
  return MODE_TO_CSS_VAR[leg.mode];
}

export function getLegForeground(leg: RouteLeg): string {
  if (leg.lineId && LINE_MAP[leg.lineId]) {
    const token = LINE_MAP[leg.lineId].colorToken;
    if (TOKEN_TO_ON_CSS_VAR[token]) return TOKEN_TO_ON_CSS_VAR[token];
  }
  return MODE_TO_ON_CSS_VAR[leg.mode];
}

export function getModeColor(mode: ModeKey): string {
  return MODE_TO_CSS_VAR[mode];
}

export function getModeForeground(mode: ModeKey): string {
  return MODE_TO_ON_CSS_VAR[mode];
}

export function formatRupee(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function formatKm(km: number): string {
  if (km < 1) {
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function getModeSummary(option: RouteOption): string {
  const rides = option.legs.filter((l) => l.mode !== 'walk');
  if (!rides.length) return 'Walk';
  return rides
    .map((l) => {
      if (l.from === 'ME' && l.mode === 'auto') return 'Toto';
      return l.lineId
        ? l.lineName.replace(' local', '').replace(' Metro', '')
        : network.modes[l.mode].label;
    })
    .join(' → ');
}

export function describeLeg(leg: RouteLeg): { title: string; subtitle: string } {
  if (leg.mode === 'walk') {
    return {
      title:
        leg.from === 'ME' && leg.lineName.startsWith('Walk ')
          ? leg.lineName
          : `Walk ${formatKm(leg.km)} to ${leg.toName}`,
      subtitle:
        leg.from === 'ME'
          ? `${formatKm(leg.km)} on foot from your location`
          : `${formatKm(leg.km)} on foot`,
    };
  }
  if (leg.from === 'ME' && leg.mode === 'auto') {
    return {
      title: leg.lineName.startsWith('Toto ')
        ? leg.lineName
        : `Toto to ${leg.toName}`,
      subtitle: `${formatKm(leg.km)} shared auto / toto`,
    };
  }
  if (leg.mode === 'cab' || leg.mode === 'bike') {
    return {
      title: `${network.modes[leg.mode].label}: ${leg.fromName} → ${leg.toName}`,
      subtitle: `${formatKm(leg.km)} · app ride from ${leg.fromName}`,
    };
  }
  const stopsCount = Math.max(1, leg.via.length - 1);
  const wait = network.modes[leg.mode].wait;
  return {
    title: `${leg.lineName}: ${leg.fromName} → ${leg.toName}`,
    subtitle: `${stopsCount} ${stopsCount === 1 ? 'stop' : 'stops'} · ${formatKm(leg.km)} · incl. ~${wait} min wait`,
  };
}

export function buildShareText(
  fromName: string,
  toName: string,
  option: RouteOption
): string {
  const header = `${fromName} → ${toName}: ~${formatRupee(option.totalFare)}, ~${option.totalMinutes} min`;
  const lines = option.legs.map((leg, idx) => {
    const { title } = describeLeg(leg);
    const fareStr = leg.fare > 0 ? formatRupee(leg.fare) : 'Free';
    return `${idx + 1}. ${title} (${fareStr}, ${leg.minutes} min)`;
  });
  return `${header}\n${lines.join('\n')}\nFares are approximate — Kom Khoroch`;
}

const SAVED_STORAGE_KEY = 'kom_khoroch_saved_v1';

export function loadSavedCommutes(): SavedCommute[] {
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedCommutes(items: SavedCommute[]): void {
  try {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors gracefully
  }
}
