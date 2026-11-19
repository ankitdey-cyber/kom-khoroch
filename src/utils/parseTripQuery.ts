import type { AvoidableMode, TripOptions } from '../types';
import { STOP_MAP, network, planner } from './transit';

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
  fallbackNotice?: string;
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

const AI_TIMEOUT_MS = 10_000;

const VALID_AVOID: Set<AvoidableMode> = new Set([
  'cab',
  'bike',
  'bus',
  'auto',
  'ferry',
]);

const AVOID_LABELS: Record<AvoidableMode, string> = {
  cab: 'Cab',
  bike: 'Bike taxi',
  bus: 'Bus',
  auto: 'Auto',
  ferry: 'Ferry',
};

const COMMON_STOP_ALIASES: Array<[string, string]> = [
  ['salt lake sector 5', 'SC5'],
  ['salt lake sector v', 'SC5'],
  ['sector v', 'SC5'],
  ['sector 5', 'SC5'],
  ['sec v', 'SC5'],
  ['sec 5', 'SC5'],
  ['howrah station', 'HWH'],
  ['howrah junction', 'HWH'],
  ['howrah jn', 'HWH'],
  ['howrah', 'HWH'],
  ['sealdah station', 'SDH'],
  ['sealdah', 'SDH'],
  ['dum dum airport', 'APT'],
  ['kolkata airport', 'APT'],
  ['jai hind', 'APT'],
  ['airport', 'APT'],
  ['b.b.d. bag', 'DLP'],
  ['bbd bag', 'DLP'],
  ['dalhousie', 'DLP'],
  ['new garia', 'KVS'],
  ['kavi subhash', 'KVS'],
  ['tollygunge', 'MHG'],
  ['uttam kumar', 'MHG'],
  ['new town', 'NWT'],
  ['biswa bangla', 'NWT'],
  ['city centre 2', 'CC2'],
  ['cc2', 'CC2'],
  ['city centre 1', 'CTY'],
  ['city centre', 'CTY'],
  ['bidhannagar road', 'ULT'],
  ['bidhannagar', 'ULT'],
  ['ultadanga', 'ULT'],
  ['hemanta mukhopadhyay', 'RBY'],
  ['ruby', 'RBY'],
  ['new town gate', 'NBM'],
  ['technopolis', 'NBM'],
  ['garia bazar', 'KVN'],
  ['kavi nazrul', 'KVN'],
  ['hiland park', 'STR'],
  ['satyajit ray', 'STR'],
  ['bardhaman', 'BWN'],
  ['barddhaman', 'BWN'],
  ['burdwan', 'BWN'],
  ['shrirampur', 'SRP'],
  ['srirampur', 'SRP'],
  ['serampore', 'SRP'],
  ['dumdum', 'DUM'],
  ['ballygunge', 'BDG'],
  ['dharmatala', 'ESP'],
  ['dharamtala', 'ESP'],
  ['behala', 'BHC'],
];

interface AliasEntry {
  alias: string;
  stopId: string;
}

const ALL_STOP_ALIASES: AliasEntry[] = (() => {
  const seen = new Map<string, string>();
  const add = (alias: string, stopId: string) => {
    const key = alias.trim().toLowerCase();
    if (!key || key.length < 2 || !STOP_MAP[stopId]) return;
    if (!seen.has(key)) seen.set(key, stopId);
  };

  for (const stop of network.stops) {
    add(stop.name, stop.id);
    const cleaned = stop.name.replace(/[()]/g, '/');
    for (const part of cleaned.split('/')) {
      const trimmed = part.trim();
      if (trimmed.length >= 3) add(trimmed, stop.id);
    }
    add(stop.id, stop.id);
  }

  for (const [alias, stopId] of COMMON_STOP_ALIASES) {
    add(alias, stopId);
  }

  return Array.from(seen.entries())
    .map(([alias, stopId]) => ({ alias, stopId }))
    .sort((a, b) => b.alias.length - a.alias.length);
})();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function snapWalkKm(val: number): number {
  const options = [0.5, 1, 1.5, 2];
  return options.reduce((best, curr) =>
    Math.abs(curr - val) < Math.abs(best - val) ? curr : best
  );
}

function normalizeStructuredData(
  data: ServerParseResponse,
  query: string,
  currentOptions: TripOptions
): ParsedTripQuery {
  const summaryParts: string[] = [];
  const parsed: ParsedTripQuery = { summaryParts };

  const asksForCurrentLocation =
    Boolean(data.fromCurrentLocation) ||
    (!data.fromStopId &&
      /(?:\b(?:from\s+here|from\s+my\s+(?:current\s+)?location|current\s+location|near\s+me)\b|এখান\s*থেকে)/i.test(
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
      summaryParts.push(
        `${filtered.map((m) => AVOID_LABELS[m]).join(', ')} avoided`
      );
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
    const clamped = Math.min(
      100,
      Math.max(0, Math.round(data.timeValuePer10Min / 5) * 5)
    );
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

export function parseTripQueryKeywordFallback(
  query: string,
  currentOptions: TripOptions
): ParsedTripQuery {
  const lower = query.toLowerCase();
  const occupied: Array<[number, number]> = [];
  const matches: Array<{ start: number; end: number; stopId: string }> = [];

  for (const { alias, stopId } of ALL_STOP_ALIASES) {
    const pattern = new RegExp(
      `(?<![a-z0-9])${escapeRegex(alias)}(?![a-z0-9])`,
      'gi'
    );
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(lower)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      const overlaps = occupied.some(
        ([s, e]) => Math.max(s, start) < Math.min(e, end)
      );
      if (!overlaps) {
        occupied.push([start, end]);
        matches.push({ start, end, stopId });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const uniqueMatches: Array<{ start: number; end: number; stopId: string }> = [];
  for (const match of matches) {
    if (!uniqueMatches.some((u) => u.stopId === match.stopId)) {
      uniqueMatches.push(match);
    }
  }

  const fromCurrentLocation =
    /(?:\b(?:from\s+here|from\s+my\s+(?:current\s+)?location|current\s+location|near\s+me)\b|এখান\s*থেকে)/i.test(
      query
    );

  let fromStopId = '';
  let toStopId = '';

  if (fromCurrentLocation) {
    if (uniqueMatches.length > 0) {
      toStopId = uniqueMatches[0].stopId;
    }
  } else if (uniqueMatches.length >= 2) {
    const first = uniqueMatches[0];
    const second = uniqueMatches[1];
    const beforeFirst = lower.slice(Math.max(0, first.start - 10), first.start);
    const beforeSecond = lower.slice(first.end, second.start);
    if (/\bto\s+$/.test(beforeFirst) && /\bfrom\s+$/.test(beforeSecond)) {
      fromStopId = second.stopId;
      toStopId = first.stopId;
    } else {
      fromStopId = first.stopId;
      toStopId = second.stopId;
    }
  } else if (uniqueMatches.length === 1) {
    const first = uniqueMatches[0];
    const beforeFirst = lower.slice(Math.max(0, first.start - 12), first.start);
    if (/\bfrom\s+$/.test(beforeFirst)) {
      fromStopId = first.stopId;
    } else {
      toStopId = first.stopId;
    }
  }

  const avoid: AvoidableMode[] = [];
  const avoidPatterns: Array<[AvoidableMode, RegExp]> = [
    ['bus', /\b(?:no|avoid|without|skip|exclude)\s+(?:the\s+)?bus(?:es)?\b/i],
    ['cab', /\b(?:no|avoid|without|skip|exclude)\s+(?:the\s+)?(?:cab|cabs|taxi|uber|ola)\b/i],
    ['bike', /\b(?:no|avoid|without|skip|exclude)\s+(?:the\s+)?(?:bike|bikes|bike\s+taxi|rapido)\b/i],
    ['auto', /\b(?:no|avoid|without|skip|exclude)\s+(?:the\s+)?(?:auto|autos|toto|totos)\b/i],
    ['ferry', /\b(?:no|avoid|without|skip|exclude)\s+(?:the\s+)?(?:ferry|ferries|boat|launch)\b/i],
  ];
  for (const [mode, regex] of avoidPatterns) {
    if (regex.test(query)) avoid.push(mode);
  }
  const comboAvoid = query.match(
    /\b(?:no|avoid|without|skip)\s+([a-z\s,&/]+?)(?:\s+(?:from|to|under|below|peak|off-peak|with)|$)/i
  );
  if (comboAvoid) {
    const clause = comboAvoid[1].toLowerCase();
    if (/\bbus(?:es)?\b/.test(clause) && !avoid.includes('bus')) avoid.push('bus');
    if (/\b(?:cab|cabs|taxi|uber|ola)\b/.test(clause) && !avoid.includes('cab')) avoid.push('cab');
    if (/\b(?:bike|bikes|rapido)\b/.test(clause) && !avoid.includes('bike')) avoid.push('bike');
    if (/\b(?:auto|autos|toto)\b/.test(clause) && !avoid.includes('auto')) avoid.push('auto');
    if (/\b(?:ferry|ferries|boat|launch)\b/.test(clause) && !avoid.includes('ferry')) avoid.push('ferry');
  }

  let peak: boolean | null = null;
  if (/\b(?:off[-\s]?peak|non[-\s]?peak|afternoon|late\s+night)\b/i.test(query)) {
    peak = false;
  } else if (/\b(?:peak|rush\s+hour|office\s+hour)\b/i.test(query)) {
    peak = true;
  }

  let smartCard: boolean | null = null;
  if (/\b(?:no|without)\s+smart\s*card\b/i.test(query)) {
    smartCard = false;
  } else if (/\bsmart\s*card\b/i.test(query)) {
    smartCard = true;
  }

  let timeValuePer10Min: number | null = null;
  if (/\b(?:cheapest|lowest|budget|cheap|kom\s+khoroch)\b/i.test(query)) {
    timeValuePer10Min = 0;
  } else if (/\b(?:fastest|quickest|fast|urgent)\b/i.test(query)) {
    timeValuePer10Min = 100;
  } else if (/\b(?:balanced|smart\s+pick)\b/i.test(query)) {
    timeValuePer10Min = 20;
  }

  let budget: number | null = null;
  const budgetMatch = query.match(
    /\b(?:under|below|within|budget(?:\s+of)?|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d{1,4})\b/i
  );
  if (budgetMatch) {
    const n = Number(budgetMatch[1]);
    if (Number.isFinite(n) && n > 0) budget = n;
  }

  let maxWalkKm: number | null = null;
  const walkMatch = query.match(
    /\b(?:max\s+walk|walk(?:\s+up\s+to|\s+under|\s+max)?)\s*(\d+(?:\.\d+)?)\s*(km|m)\b/i
  );
  if (walkMatch) {
    const raw = Number(walkMatch[1]);
    const unit = walkMatch[2].toLowerCase();
    const km = unit === 'm' ? raw / 1000 : raw;
    if (Number.isFinite(km) && km > 0) maxWalkKm = snapWalkKm(km);
  }

  return normalizeStructuredData(
    {
      fromCurrentLocation,
      fromStopId,
      toStopId,
      avoid: avoid.length > 0 ? avoid : undefined,
      peak,
      smartCard,
      maxWalkKm,
      timeValuePer10Min,
      budget,
    },
    query,
    currentOptions
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

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as ServerParseResponse;
    if (!res.ok) {
      throw new Error(data.error || `Parser request failed (${res.status}).`);
    }

    return normalizeStructuredData(data, query, currentOptions);
  } catch (err) {
    const aiError =
      err instanceof Error && err.name === 'AbortError'
        ? `Request timed out after ${Math.round(AI_TIMEOUT_MS / 1000)} seconds.`
        : err instanceof Error
          ? err.message
          : 'Could not reach the route parser service.';

    const fallback = parseTripQueryKeywordFallback(query, currentOptions);

    if (
      fallback.fromName ||
      fallback.toName ||
      fallback.useCurrentLocation ||
      fallback.summaryParts.length > 0
    ) {
      return {
        ...fallback,
        fallbackNotice: `AI parser unavailable (${aiError}). Matched stations locally: ${fallback.summaryParts.join(' · ')}`,
      };
    }

    return {
      summaryParts: [],
      error: `AI route parser error: ${aiError} Try naming known stations like "Serampore to Sector V".`,
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
