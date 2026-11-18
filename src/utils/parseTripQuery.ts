import type { AvoidableMode, Stop, TripOptions } from '../types';
import { STOP_MAP, planner } from './transit';

export interface ParsedTripQuery {
  fromName?: string;
  toName?: string;
  avoid?: AvoidableMode[];
  timeValuePer10Min?: number;
  peak?: boolean;
  smartCard?: boolean;
  maxWalkKm?: number;
  budget?: string;
  summaryParts: string[];
  error?: string;
}

const STOP_ALIASES: Record<string, string> = {
  'sector v': 'SC5',
  'sector 5': 'SC5',
  'salt lake sector 5': 'SC5',
  'salt lake': 'SC5',
  howrah: 'HWH',
  sealdah: 'SDH',
  airport: 'APT',
  dum_dum: 'DUM',
  dumdum: 'DUM',
  ultadanga: 'ULT',
  dalhousie: 'DLP',
  'bbd bag': 'DLP',
  tollygunge: 'MHG',
  garia: 'GRB',
  'new garia': 'KVS',
  ruby: 'RBY',
  'new town': 'NWT',
  newtown: 'NWT',
};

function resolveStop(raw: string, stops: Stop[]): Stop | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const aliasId = STOP_ALIASES[lower];
  if (aliasId && STOP_MAP[aliasId]) {
    return STOP_MAP[aliasId];
  }

  const foundId = planner.findStop(trimmed);
  if (foundId && STOP_MAP[foundId]) {
    return STOP_MAP[foundId];
  }

  // Try matching longest stop name contained inside raw text
  const byLongest = [...stops].sort((a, b) => b.name.length - a.name.length);
  for (const s of byLongest) {
    if (lower.includes(s.name.toLowerCase())) {
      return s;
    }
  }

  return null;
}

function extractAvoidModes(clause: string): AvoidableMode[] {
  let text = clause.toLowerCase();
  const modes: AvoidableMode[] = [];

  if (/\bbike(?:\s+taxi)?\b|\brapido\b/.test(text)) {
    modes.push('bike');
    text = text.replace(/\bbike(?:\s+taxi)?\b|\brapido\b/g, ' ');
  }
  if (/\bcab\b|\btaxi\b|\buber\b|\bola\b/.test(text)) {
    modes.push('cab');
  }
  if (/\bbus(?:es)?\b/.test(text)) {
    modes.push('bus');
  }
  if (/\bauto(?:s|\s+rickshaw)?\b|\btoto\b/.test(text)) {
    modes.push('auto');
  }
  if (/\bferr(?:y|ies)\b|\blaunch\b|\bboat\b/.test(text)) {
    modes.push('ferry');
  }

  return Array.from(new Set(modes));
}

function snapWalkKm(val: number): number {
  const options = [0.5, 1, 1.5, 2];
  return options.reduce((best, curr) =>
    Math.abs(curr - val) < Math.abs(best - val) ? curr : best
  );
}

export function parseTripQuery(
  rawQuery: string,
  stops: Stop[],
  currentOptions: TripOptions
): ParsedTripQuery {
  const input = rawQuery.trim();
  if (!input) {
    return {
      summaryParts: [],
      error: 'Type a trip phrase such as "cheapest way from Serampore to Sector V, no bus".',
    };
  }

  let working = input;
  const summaryParts: string[] = [];
  const parsed: ParsedTripQuery = { summaryParts };

  // 1. Smart card (check before "smart pick" intent)
  if (/\bno\s+(?:metro\s+)?smart\s*card\b/i.test(working)) {
    parsed.smartCard = false;
    working = working.replace(/\bno\s+(?:metro\s+)?smart\s*card\b/gi, ' ');
  } else if (/\b(?:with\s+)?(?:metro\s+)?smart\s*card\b/i.test(working)) {
    parsed.smartCard = true;
    summaryParts.push('Smart card');
    working = working.replace(/\b(?:with\s+)?(?:metro\s+)?smart\s*card\b/gi, ' ');
  }

  // 2. Optimization intent (cheapest / fastest / balanced)
  if (/\b(cheapest|lowest\s+fare|budget|save\s+money|kom\s+khoroch)\b/i.test(working)) {
    parsed.timeValuePer10Min = 0;
    summaryParts.push('Cheapest');
    working = working.replace(
      /\b(cheapest|lowest\s+fare|save\s+money|kom\s+khoroch)\b/gi,
      ' '
    );
  } else if (/\b(fastest|quickest|shortest\s+time|hurry)\b/i.test(working)) {
    parsed.timeValuePer10Min = 100;
    summaryParts.push('Fastest');
    working = working.replace(/\b(fastest|quickest|shortest\s+time|hurry)\b/gi, ' ');
  } else if (/\b(balanced|smart\s+pick)\b/i.test(working)) {
    parsed.timeValuePer10Min = 20;
    summaryParts.push('Balanced (₹20/10m)');
    working = working.replace(/\b(balanced|smart\s+pick)\b/gi, ' ');
  }

  // 3. Peak / off-peak
  if (/\boff[- ]?peak\b/i.test(working)) {
    parsed.peak = false;
    summaryParts.push('Off-peak');
    working = working.replace(/\boff[- ]?peak(?:\s+hour)?\b/gi, ' ');
  } else if (/\bpeak(?:\s+hour)?\b|\brush\s+hour\b/i.test(working)) {
    parsed.peak = true;
    summaryParts.push('Peak hour');
    working = working.replace(/\bpeak(?:\s+hour)?\b|\brush\s+hour\b/gi, ' ');
  }

  // 4. Budget
  const budgetMatch = working.match(
    /\b(?:under|below|within|budget|max)\s*(?:₹|rs\.?|inr)?\s*(\d+)\b/i
  );
  if (budgetMatch) {
    parsed.budget = budgetMatch[1];
    summaryParts.push(`Budget ₹${budgetMatch[1]}`);
    working = working.replace(budgetMatch[0], ' ');
  }

  // 5. Max walk
  const walkMatch = working.match(
    /\b(?:max\s*walk|walk\s*(?:up\s*to|max)?)\s*(\d+(?:\.\d+)?)\s*(km|m)?\b/i
  );
  if (walkMatch) {
    const rawNum = Number(walkMatch[1]);
    const unit = (walkMatch[2] || 'km').toLowerCase();
    const km = unit === 'm' ? rawNum / 1000 : rawNum;
    if (Number.isFinite(km) && km > 0) {
      parsed.maxWalkKm = snapWalkKm(km);
      summaryParts.push(`Max walk ${parsed.maxWalkKm} km`);
    }
    working = working.replace(walkMatch[0], ' ');
  }

  // 6. Avoided modes: "no bus", "avoid cab and bike", "without auto or ferry"
  const avoided: AvoidableMode[] = [];
  const avoidRegex =
    /\b(?:no|avoid|without|skip|exclude)\s+([^,.;]+?)(?=(?:\s+(?:from|to)\b)|[,.;]|$)/gi;
  let match: RegExpExecArray | null;
  const matchedSpans: string[] = [];
  while ((match = avoidRegex.exec(working)) !== null) {
    const modesFound = extractAvoidModes(match[1]);
    if (modesFound.length > 0) {
      avoided.push(...modesFound);
      matchedSpans.push(match[0]);
    }
  }
  for (const span of matchedSpans) {
    working = working.replace(span, ' ');
  }

  const uniqueAvoid = Array.from(new Set(avoided));
  if (uniqueAvoid.length > 0) {
    parsed.avoid = uniqueAvoid;
    const labels: Record<AvoidableMode, string> = {
      cab: 'Cab',
      bike: 'Bike taxi',
      bus: 'Bus',
      auto: 'Auto',
      ferry: 'Ferry',
    };
    summaryParts.push(
      `${uniqueAvoid.map((m) => labels[m]).join(', ')} avoided`
    );
  }

  // 7. Extract From -> To
  const cleanedRouteText = working
    .replace(/\b(?:way|route|commute|trip|travel|how\s+to\s+go|go|get)\b/gi, ' ')
    .replace(/[,.;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const routeMatch = cleanedRouteText.match(
    /^(?:from\s+)?(.+?)\s+(?:\bto\b|->|→)\s+(.+)$/i
  );

  if (routeMatch) {
    const fromCandidate = routeMatch[1].replace(/^from\s+/i, '').trim();
    const toCandidate = routeMatch[2].trim();
    const fromStop = resolveStop(fromCandidate, stops);
    const toStop = resolveStop(toCandidate, stops);

    if (!fromStop) {
      return {
        ...parsed,
        error: `Could not match starting stop "${fromCandidate}".`,
      };
    }
    if (!toStop) {
      return {
        ...parsed,
        error: `Could not match destination "${toCandidate}".`,
      };
    }

    parsed.fromName = fromStop.name;
    parsed.toName = toStop.name;
    if (parsed.avoid === undefined) {
      parsed.avoid = [];
    }
    summaryParts.unshift(`${fromStop.name} → ${toStop.name}`);
  } else if (uniqueAvoid.length === 0 && summaryParts.length === 0) {
    return {
      ...parsed,
      error:
        'Try phrasing like "cheapest way from Serampore to Sector V, no bus".',
    };
  } else if (parsed.avoid === undefined) {
    parsed.avoid = currentOptions.avoid;
  }

  return parsed;
}
