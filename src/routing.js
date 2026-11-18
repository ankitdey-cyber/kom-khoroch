export const PRESETS = {
  cheapest: 0.3,
  fastest: 12,
};

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a, b) {
  if (!a || !b) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function fare(mode, km, opts = {}) {
  const { smartCard = false, peak = false } = opts;
  const d = Math.max(0.1, km);

  switch (mode) {
    case 'walk':
      return 0;
    case 'metro': {
      let base = 30;
      if (d <= 2) base = 5;
      else if (d <= 5) base = 10;
      else if (d <= 8) base = 15;
      else if (d <= 11) base = 20;
      else if (d <= 16) base = 25;
      return smartCard ? Math.round(base * 0.9) : base;
    }
    case 'rail': {
      if (d <= 15) return 5;
      if (d <= 35) return 10;
      return 15;
    }
    case 'bus': {
      if (d <= 5) return 10;
      if (d <= 15) return 15;
      if (d <= 24) return 20;
      return 25;
    }
    case 'auto': {
      if (d <= 2.5) return 10;
      return 10 + Math.ceil((d - 2.5) / 2.5) * 5;
    }
    case 'ferry':
      return 6;
    case 'bike': {
      const extra = Math.max(0, d - 2);
      const raw = 25 + extra * 8;
      return Math.round((peak ? raw * 1.15 : raw) / 5) * 5;
    }
    case 'cab': {
      const extra = Math.max(0, d - 2);
      const raw = 55 + extra * 18;
      return Math.round((peak ? raw * 1.25 : raw) / 5) * 5;
    }
    default:
      return 0;
  }
}

export function minutes(modeCfg, mode, km, opts = {}) {
  const { peak = false, includeWait = true } = opts;
  const cfg = modeCfg?.[mode];
  if (!cfg) return 0;
  const speed = peak && cfg.peak ? cfg.peak : cfg.speed;
  const detour = cfg.detour ?? 1.15;
  const travelMin = ((km * detour) / Math.max(1, speed)) * 60;
  const waitMin = includeWait ? cfg.wait ?? 0 : 0;
  return Math.max(1, Math.round(travelMin + waitMin));
}

function lineSegmentKm(stopMap, stopIds, i, j) {
  const step = i < j ? 1 : -1;
  let total = 0;
  for (let k = i; k !== j; k += step) {
    total += haversineKm(stopMap[stopIds[k]], stopMap[stopIds[k + step]]);
  }
  return total;
}

function lineSegmentVia(stopIds, i, j) {
  const via = [];
  const step = i < j ? 1 : -1;
  for (let k = i; k !== j + step; k += step) {
    via.push(stopIds[k]);
  }
  return via;
}

export function createPlanner(network) {
  const stops = network.stops || [];
  const lines = network.lines || [];
  const modes = network.modes || {};
  const stopMap = Object.fromEntries(stops.map((s) => [s.id, s]));

  function findStop(text) {
    if (!text || typeof text !== 'string') return null;
    const q = text.trim().toLowerCase();
    if (!q) return null;

    const exactId = stops.find((s) => s.id.toLowerCase() === q);
    if (exactId) return exactId.id;

    const exactName = stops.find((s) => s.name.toLowerCase() === q);
    if (exactName) return exactName.id;

    const prefixName = stops.find((s) => s.name.toLowerCase().startsWith(q));
    if (prefixName) return prefixName.id;

    const substrName = stops.find((s) => s.name.toLowerCase().includes(q));
    if (substrName) return substrName.id;

    return null;
  }

  function runDijkstra(fromId, toId, opts, timeValuePerMin) {
    const {
      peak = false,
      smartCard = false,
      avoid = [],
      maxWalkKm = 1,
    } = opts;
    const avoidSet = new Set(avoid);

    // Build adjacency list from pre-expanded line rides + walk + direct cab/bike
    const adj = new Map();
    const addEdge = (from, edge) => {
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from).push(edge);
    };

    for (const line of lines) {
      if (avoidSet.has(line.mode)) continue;
      const ids = line.stops;
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = 0; j < ids.length; j += 1) {
          if (i === j) continue;
          const a = ids[i];
          const b = ids[j];
          const km = lineSegmentKm(stopMap, ids, i, j);
          const legFare = fare(line.mode, km, { smartCard, peak });
          const legMin = minutes(modes, line.mode, km, {
            peak,
            includeWait: true,
          });
          addEdge(a, {
            mode: line.mode,
            lineId: line.id,
            lineName: line.name,
            from: a,
            to: b,
            fromName: stopMap[a]?.name ?? a,
            toName: stopMap[b]?.name ?? b,
            via: lineSegmentVia(ids, i, j),
            km: Number(km.toFixed(2)),
            fare: legFare,
            minutes: legMin,
          });
        }
      }
    }

    // Walk edges between nearby stops (up to maxWalkKm)
    for (let i = 0; i < stops.length; i += 1) {
      for (let j = i + 1; j < stops.length; j += 1) {
        const sA = stops[i];
        const sB = stops[j];
        const km = haversineKm(sA, sB);
        if (km <= maxWalkKm) {
          const min = minutes(modes, 'walk', km, { peak, includeWait: false });
          addEdge(sA.id, {
            mode: 'walk',
            lineId: null,
            lineName: 'Walk',
            from: sA.id,
            to: sB.id,
            fromName: sA.name,
            toName: sB.name,
            via: [sA.id, sB.id],
            km: Number(km.toFixed(2)),
            fare: 0,
            minutes: min,
          });
          addEdge(sB.id, {
            mode: 'walk',
            lineId: null,
            lineName: 'Walk',
            from: sB.id,
            to: sA.id,
            fromName: sB.name,
            toName: sA.name,
            via: [sB.id, sA.id],
            km: Number(km.toFixed(2)),
            fare: 0,
            minutes: min,
          });
        }
      }
    }

    // Point-to-point cab and bike taxi edges (direct or from/to major hubs)
    const directModes = ['bike', 'cab'].filter((m) => !avoidSet.has(m));
    if (directModes.length > 0) {
      const candidateHubs = new Set([fromId, toId]);
      for (const s of stops) {
        if (s.place) candidateHubs.add(s.id);
      }

      for (const sA of stops) {
        for (const sB of stops) {
          if (sA.id === sB.id) continue;
          const isDirectOD = sA.id === fromId && sB.id === toId;
          const touchesEndpoint = sA.id === fromId || sB.id === toId;
          if (!isDirectOD && !touchesEndpoint) continue;
          const km = haversineKm(sA, sB);
          if (!isDirectOD && km > 10) continue;

          for (const mode of directModes) {
            const legFare = fare(mode, km, { smartCard, peak });
            const legMin = minutes(modes, mode, km, {
              peak,
              includeWait: true,
            });
            addEdge(sA.id, {
              mode,
              lineId: null,
              lineName: modes[mode].label,
              from: sA.id,
              to: sB.id,
              fromName: sA.name,
              toName: sB.name,
              via: [sA.id, sB.id],
              km: Number(km.toFixed(2)),
              fare: legFare,
              minutes: legMin,
            });
          }
        }
      }
    }

    // Dijkstra state: `${stopId}|${lastWasWalk ? 1 : 0}`
    const dist = new Map();
    const prev = new Map();
    const visited = new Set();
    const queue = [];

    const startKey = `${fromId}|0`;
    dist.set(startKey, 0);
    queue.push({ key: startKey, stopId: fromId, lastWalk: false, cost: 0 });

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const curr = queue.shift();
      if (!curr || visited.has(curr.key)) continue;
      visited.add(curr.key);

      if (curr.stopId === toId) {
        const legs = [];
        let cursor = curr.key;
        while (prev.has(cursor)) {
          const step = prev.get(cursor);
          legs.unshift(step.edge);
          cursor = step.parent;
        }
        return legs;
      }

      const edges = adj.get(curr.stopId) || [];
      for (const edge of edges) {
        const isWalk = edge.mode === 'walk';
        if (curr.lastWalk && isWalk) continue;

        const nextKey = `${edge.to}|${isWalk ? 1 : 0}`;
        if (visited.has(nextKey)) continue;

        const boardingPenalty = isWalk ? 0.5 : 2;
        const edgeCost =
          edge.fare + edge.minutes * timeValuePerMin + boardingPenalty;
        const nextCost = curr.cost + edgeCost;

        if (!dist.has(nextKey) || nextCost < dist.get(nextKey)) {
          dist.set(nextKey, nextCost);
          prev.set(nextKey, { parent: curr.key, edge });
          queue.push({
            key: nextKey,
            stopId: edge.to,
            lastWalk: isWalk,
            cost: nextCost,
          });
        }
      }
    }

    return null;
  }

  function summarizeLegs(legs, label) {
    const totalFare = legs.reduce((s, l) => s + l.fare, 0);
    const totalMinutes = legs.reduce((s, l) => s + l.minutes, 0);
    const rides = legs.filter((l) => l.mode !== 'walk').length;
    const walkKm = Number(
      legs
        .filter((l) => l.mode === 'walk')
        .reduce((s, l) => s + l.km, 0)
        .toFixed(2)
    );
    const signature = legs
      .map((l) => `${l.mode}:${l.lineId ?? 'direct'}:${l.from}->${l.to}`)
      .join('|');

    return {
      legs,
      totalFare,
      totalMinutes,
      rides,
      walkKm,
      signature,
      labels: [label],
    };
  }

  function planTrip(from, to, opts = {}) {
    const fromId = stopMap[from] ? from : findStop(from);
    const toId = stopMap[to] ? to : findStop(to);
    if (!fromId || !toId || fromId === toId) {
      return { options: [], cab: null };
    }

    const peak = Boolean(opts.peak);
    const smartCard = Boolean(opts.smartCard);
    const avoid = Array.isArray(opts.avoid) ? opts.avoid : [];
    const maxWalkKm =
      typeof opts.maxWalkKm === 'number' && opts.maxWalkKm > 0
        ? opts.maxWalkKm
        : 1;
    const timeValuePer10Min =
      typeof opts.timeValuePer10Min === 'number' && opts.timeValuePer10Min >= 0
        ? opts.timeValuePer10Min
        : 20;

    const directKm = haversineKm(stopMap[fromId], stopMap[toId]);
    const cab = {
      fare: fare('cab', directKm, { peak, smartCard }),
      minutes: minutes(modes, 'cab', directKm, { peak, includeWait: true }),
    };

    const presets = [
      { label: 'Cheapest', tvPerMin: PRESETS.cheapest },
      { label: 'Smart pick', tvPerMin: timeValuePer10Min / 10 },
      { label: 'Fastest', tvPerMin: PRESETS.fastest },
    ];

    const bySig = new Map();
    for (const preset of presets) {
      const legs = runDijkstra(
        fromId,
        toId,
        { peak, smartCard, avoid, maxWalkKm },
        preset.tvPerMin
      );
      if (!legs || legs.length === 0) continue;
      const summary = summarizeLegs(legs, preset.label);
      if (bySig.has(summary.signature)) {
        const existing = bySig.get(summary.signature);
        if (!existing.labels.includes(preset.label)) {
          existing.labels.push(preset.label);
        }
      } else {
        bySig.set(summary.signature, summary);
      }
    }

    const options = Array.from(bySig.values()).sort(
      (a, b) => a.totalFare - b.totalFare || a.totalMinutes - b.totalMinutes
    );

    return { options, cab };
  }

  return {
    planTrip,
    findStop,
    stops,
    lines,
  };
}
