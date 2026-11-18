import React, { useMemo } from 'react';
import type { RouteOption } from '../types';
import { LINE_MAP, STOP_MAP, getLegColor, network } from '../utils/transit';

interface RouteMapProps {
  option: RouteOption;
  originPoint?: { lat: number; lng: number } | null;
}

const K = 1000;
const COS = Math.cos((22.6 * Math.PI) / 180);

function projectCoords(lat: number, lng: number): [number, number] {
  return [(lng - 88.28) * COS * K, (22.95 - lat) * K];
}

export const RouteMap: React.FC<RouteMapProps> = ({
  option,
  originPoint = null,
}) => {
  const project = (stopId: string): [number, number] => {
    if (stopId === 'ME' && originPoint) {
      return projectCoords(originPoint.lat, originPoint.lng);
    }
    const s = STOP_MAP[stopId];
    if (!s) return [0, 0];
    return projectCoords(s.lat, s.lng);
  };

  const svgData = useMemo(() => {
    const pts = option.legs.flatMap((leg) => leg.via.map(project));
    if (pts.length === 0) return null;

    let x0 = Math.min(...pts.map((p) => p[0]));
    let x1 = Math.max(...pts.map((p) => p[0]));
    let y0 = Math.min(...pts.map((p) => p[1]));
    let y1 = Math.max(...pts.map((p) => p[1]));

    let w = x1 - x0;
    let h = y1 - y0;
    const minSpan = 34;
    if (w < minSpan) {
      x0 -= (minSpan - w) / 2;
      w = minSpan;
    }
    if (h < minSpan) {
      y0 -= (minSpan - h) / 2;
      h = minSpan;
    }

    const padX = Math.max(w, h) * 0.28;
    const padY = Math.max(w, h) * 0.22;
    x0 -= padX;
    y0 -= padY;
    w += padX * 2;
    h += padY * 2;

    if (h / w > 1.35) {
      const nw = h / 1.35;
      x0 -= (nw - w) / 2;
      w = nw;
    }
    if (w / h > 1.55) {
      const nh = w / 1.55;
      y0 -= (nh - h) / 2;
      h = nh;
    }

    const fs = Math.max(w, h) / 26;
    const sw = fs * 0.55;

    const baseLines = network.lines
      .filter((l) => l.mode === 'metro' || l.mode === 'rail')
      .map((l) => ({
        id: l.id,
        points: l.stops.map((id) => project(id).join(',')).join(' '),
      }));

    const stopsOnRoute = Array.from(
      new Set(option.legs.flatMap((l) => l.via))
    );
    const endpointIds = Array.from(
      new Set(option.legs.flatMap((l) => [l.from, l.to]))
    );

    const legendMap = new Map<string, string>();
    option.legs.forEach((leg) => {
      const name =
        leg.lineId && LINE_MAP[leg.lineId]
          ? LINE_MAP[leg.lineId].name
          : network.modes[leg.mode].label;
      if (!legendMap.has(name)) {
        legendMap.set(name, getLegColor(leg));
      }
    });

    return {
      x0,
      w,
      viewBox: `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`,
      fs,
      sw,
      baseLines,
      stopsOnRoute,
      endpointIds,
      legend: Array.from(legendMap.entries()),
    };
  }, [option, originPoint]);

  if (!svgData) return null;

  const {
    x0,
    w,
    viewBox,
    fs,
    sw,
    baseLines,
    stopsOnRoute,
    endpointIds,
    legend,
  } = svgData;
  const endpointSet = new Set(endpointIds);
  const startId = option.legs[0]?.from;
  const endId = option.legs[option.legs.length - 1]?.to;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-xl border border-outline-variant/30 p-2"
        style={{ backgroundColor: 'var(--map-bg)' }}
      >
        <svg
          viewBox={viewBox}
          role="img"
          aria-label="Schematic transit map of the selected route"
          className="block h-auto max-h-[320px] w-full"
        >
          {/* Background metro & local rail grid */}
          {baseLines.map((line) => (
            <polyline
              key={line.id}
              points={line.points}
              fill="none"
              stroke="var(--map-line)"
              strokeWidth={sw * 0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Active route legs */}
          {option.legs.map((leg, i) => {
            const pts = leg.via.map((id) => project(id).join(',')).join(' ');
            const dashed = ['walk', 'cab', 'bike', 'auto', 'ferry'].includes(
              leg.mode
            );
            return (
              <polyline
                key={`${leg.from}-${leg.to}-${i}`}
                points={pts}
                fill="none"
                stroke={getLegColor(leg)}
                strokeWidth={leg.mode === 'walk' ? sw * 0.8 : sw * 1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={
                  dashed
                    ? `${(sw * 1.4).toFixed(2)} ${(sw * 1.1).toFixed(2)}`
                    : undefined
                }
              />
            );
          })}

          {/* Stop markers */}
          {stopsOnRoute.map((id) => {
            const [cx, cy] = project(id);
            const isEnd = endpointSet.has(id);
            const isOriginOrDest = id === startId || id === endId;
            return (
              <circle
                key={id}
                cx={cx}
                cy={cy}
                r={isOriginOrDest ? sw * 1.45 : isEnd ? sw * 1.2 : sw * 0.55}
                fill={
                  isOriginOrDest
                    ? 'var(--primary)'
                    : 'var(--surface-container-lowest)'
                }
                stroke="var(--on-surface)"
                strokeWidth={isEnd ? sw * 0.5 : sw * 0.28}
              />
            );
          })}

          {/* Labels for leg endpoints */}
          {endpointIds.map((id, idx) => {
            const [x, y] = project(id);
            const name = id === 'ME' ? 'My location' : (STOP_MAP[id]?.name ?? id);
            const onRightSide = x > x0 + w * 0.62;
            const yOffset = idx % 2 === 0 ? -fs * 0.3 : fs * 0.7;
            return (
              <text
                key={`label-${id}`}
                x={onRightSide ? x - sw * 2.2 : x + sw * 2.2}
                y={y + yOffset}
                textAnchor={onRightSide ? 'end' : 'start'}
                style={{
                  fontFamily:
                    '"Plus Jakarta Sans", "Hind Siliguri", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: `${fs}px`,
                  fill: 'var(--on-surface)',
                  paintOrder: 'stroke',
                  stroke: 'var(--map-bg)',
                  strokeWidth: `${fs * 0.35}px`,
                }}
              >
                {name}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-outline-variant/30 pt-2.5 text-[11px] font-semibold text-on-surface-variant">
        {legend.map(([name, color]) => (
          <span key={name} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span>{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
