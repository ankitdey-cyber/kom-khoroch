export type ModeKey =
  | 'metro'
  | 'rail'
  | 'bus'
  | 'auto'
  | 'cab'
  | 'bike'
  | 'ferry'
  | 'walk';

export type AvoidableMode = 'cab' | 'bike' | 'bus' | 'auto' | 'ferry';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  place: boolean;
}

export interface TransitLine {
  id: string;
  name: string;
  mode: ModeKey;
  colorToken: string;
  stops: string[];
}

export interface ModeConfig {
  label: string;
  speed: number;
  peak?: number;
  wait: number;
  detour: number;
  tag: string;
  color: string;
}

export interface NetworkData {
  note: string;
  stops: Stop[];
  lines: TransitLine[];
  modes: Record<ModeKey, ModeConfig>;
  fareNotes: Record<ModeKey, string>;
}

export interface TripOptions {
  peak: boolean;
  smartCard: boolean;
  avoid: AvoidableMode[];
  maxWalkKm: number;
  timeValuePer10Min: number;
}

export interface RouteLeg {
  mode: ModeKey;
  lineId: string | null;
  lineName: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  via: string[];
  km: number;
  fare: number;
  minutes: number;
}

export interface RouteOption {
  legs: RouteLeg[];
  totalFare: number;
  totalMinutes: number;
  rides: number;
  walkKm: number;
  signature: string;
  labels: string[];
}

export interface CabReference {
  fare: number;
  minutes: number;
}

export interface NearestStop extends Stop {
  km: number;
}

export interface GpsOrigin {
  lat: number;
  lng: number;
  nearestStopId: string;
  nearestStopName: string;
  distanceKm: number;
  displayLabel: string;
}

export interface PlanTripResult {
  options: RouteOption[];
  cab: CabReference | null;
  outsideArea?: boolean;
  error?: string;
}

export interface SavedCommute {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  options: TripOptions;
  budget: string;
  lastFare: number;
  lastMinutes: number;
  modeSummary: string;
  savedAt: number;
}

export type TabKey = 'plan' | 'saved' | 'about';
export type LangKey = 'en' | 'bn';
export type ThemeKey = 'light' | 'dark';
