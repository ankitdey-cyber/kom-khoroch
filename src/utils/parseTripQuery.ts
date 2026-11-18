import type { AvoidableMode, TripOptions } from '../types';
import { STOP_MAP, planner } from './transit';

export interface ParsedTripQuery {
  fromName?: string;
  toName?: string;
  useCurrentLocation?: boolean;
  avoid?: AvoidableMode[];
  timeValuePer10Min?: number;
  peak?: boolean;
  smartCard?: boolean;
  maxWalkKm?: number;
  budget?: string;
  summaryParts: string[];
  error?: string;
}

interface ServerParseResponse {
  fromCurrentLocation?: boolean;
  fromStopId?: string;
  toStopId?: string;
  avoid?: string[];
  peak?: boolean | null;
  smartCard?: boolean | null;
  maxWalkKm?: number | null;
  timeValuePer10Min?: number | null;
  budget?: number | null;
  summary?: string;
  error?: string;
}

const VALID_AVOID: Set<AvoidableMode> = new Set([
  'cab',
  'bike',
  'bus',
  'auto',
  'ferry',
]);

function snapWalkKm(val: number): number {
  const options = [0.5, 1, 1.5, 2];
  return options.reduce((best, curr) =>
    Math.abs(curr - val) < Math.abs(best - val) ? curr : best
  );
}

export async function parseTripQueryWithApi(
  rawQuery: string,
  currentOptions: TripOptions
): Promise<ParsedTripQuery> {
  const query = rawQuery.trim();
  if (!query) {
    return {
      summaryParts: [],
      error:
        'Type a trip phrase such as "cheapest way from Serampore to Sector V, no bus".',
    };
  }

  let res: Response;
  try {
    res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch {
    return {
      summaryParts: [],
      error: 'Could not reach the route parser service. Please try again.',
    };
  }

  const data = (await res.json().catch(() => ({}))) as ServerParseResponse;
  if (!res.ok) {
    return {
      summaryParts: [],
      error: data.error || `Parser request failed (${res.status}).`,
    };
  }

  const summaryParts: string[] = [];
  const parsed: ParsedTripQuery = { summaryParts };

  const asksForCurrentLocation =
    Boolean(data.fromCurrentLocation) ||
    (!data.fromStopId &&
      /\b(?:from\s+here|from\s+my\s+(?:current\s+)?location|current\s+location)\b/i.test(
        query
      ));

  if (asksForCurrentLocation) {
    parsed.useCurrentLocation = true;
  } else if (data.fromStopId) {
    const resolvedId = STOP_MAP[data.fromStopId]
      ? data.fromStopId
      : planner.findStop(data.fromStopId);
    if (resolvedId && STOP_MAP[resolvedId]) {
      parsed.fromName = STOP_MAP[resolvedId].name;
    }
  }

  if (data.toStopId) {
    const resolvedId = STOP_MAP[data.toStopId]
      ? data.toStopId
      : planner.findStop(data.toStopId);
    if (resolvedId && STOP_MAP[resolvedId]) {
      parsed.toName = STOP_MAP[resolvedId].name;
    }
  }

  if (parsed.useCurrentLocation && parsed.toName) {
    summaryParts.push(`My location → ${parsed.toName}`);
  } else if (parsed.useCurrentLocation) {
    summaryParts.push('From my location');
  } else if (parsed.fromName && parsed.toName) {
    summaryParts.push(`${parsed.fromName} → ${parsed.toName}`);
  } else if (parsed.fromName) {
    summaryParts.push(`From ${parsed.fromName}`);
  } else if (parsed.toName) {
    summaryParts.push(`To ${parsed.toName}`);
  }

  if (Array.isArray(data.avoid)) {
    const filtered = Array.from(
      new Set(
        data.avoid.filter((m): m is AvoidableMode =>
          VALID_AVOID.has(m as AvoidableMode)
        )
      )
    );
    parsed.avoid = filtered;
    if (filtered.length > 0) {
      const labels: Record<AvoidableMode, string> = {
        cab: 'Cab',
        bike: 'Bike taxi',
        bus: 'Bus',
        auto: 'Auto',
        ferry: 'Ferry',
      };
      summaryParts.push(`${filtered.map((m) => labels[m]).join(', ')} avoided`);
    }
  } else {
    parsed.avoid = currentOptions.avoid;
  }

  if (typeof data.peak === 'boolean') {
    parsed.peak = data.peak;
    summaryParts.push(data.peak ? 'Peak hour' : 'Off-peak');
  }

  if (typeof data.smartCard === 'boolean') {
    parsed.smartCard = data.smartCard;
    if (data.smartCard) summaryParts.push('Smart card (-10%)');
  }

  if (typeof data.maxWalkKm === 'number' && data.maxWalkKm > 0) {
    parsed.maxWalkKm = snapWalkKm(data.maxWalkKm);
    summaryParts.push(`Max walk ${parsed.maxWalkKm} km`);
  }

  if (typeof data.timeValuePer10Min === 'number' && data.timeValuePer10Min >= 0) {
    const clamped = Math.min(100, Math.max(0, Math.round(data.timeValuePer10Min / 5) * 5));
    parsed.timeValuePer10Min = clamped;
    if (clamped === 0) summaryParts.push('Cheapest');
    else if (clamped >= 100) summaryParts.push('Fastest');
    else summaryParts.push(`Time value ₹${clamped}/10m`);
  }

  if (typeof data.budget === 'number' && data.budget > 0) {
    parsed.budget = String(Math.round(data.budget));
    summaryParts.push(`Budget ₹${parsed.budget}`);
  }

  if (summaryParts.length === 0 && data.summary) {
    summaryParts.push(data.summary);
  }

  return parsed;
}
