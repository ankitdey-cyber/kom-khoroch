import React from 'react';
import type { LangKey, ModeKey } from '../types';
import { getModeColor, network } from '../utils/transit';

interface AboutScreenProps {
  lang: LangKey;
}

const MODE_ORDER: ModeKey[] = [
  'metro',
  'rail',
  'bus',
  'auto',
  'ferry',
  'bike',
  'cab',
  'walk',
];

export const AboutScreen: React.FC<AboutScreenProps> = ({ lang }) => {
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="grid gap-3 rounded-[12px] border border-rule bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">
            {lang === 'bn' ? 'কম খরচ সম্পর্কে' : 'About Kom Khoroch'}
          </h1>
          <span className="text-xs font-semibold text-muted">
            {network.stops.length} stops · {network.lines.length} transit lines
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted">
          Kom Khoroch is a budget-first commute planner for Greater Kolkata and
          Hooghly. It combines Kolkata Metro (Blue, Green, Yellow, Orange, and
          Purple lines), Eastern Railway suburban trains, bus corridors, shared
          autos, Hooghly river ferries, bike taxis, app cabs, and walking into a
          single multi-modal city graph.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[8px] border border-rule bg-bg p-3">
            <div className="font-display text-xs font-bold text-ink">
              01. One City Graph
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              All modes share common stops so interchanges like Howrah Rail to
              Green Line Metro or Bally to Dakshineswar happen naturally.
            </p>
          </div>

          <div className="rounded-[8px] border border-rule bg-bg p-3">
            <div className="font-display text-xs font-bold text-ink">
              02. Cost + Time Value
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Dijkstra routing minimizes rupee fare plus your chosen value of
              time (₹/min) and a small boarding penalty per transfer.
            </p>
          </div>

          <div className="rounded-[8px] border border-rule bg-bg p-3">
            <div className="font-display text-xs font-bold text-ink">
              03. Three Presets
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Cheapest uses ₹0.3/min, Fastest uses ₹12/min, and Smart pick uses
              your slider setting. Consecutive walks are disallowed.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-[12px] border border-rule bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-extrabold text-ink">
            {lang === 'bn' ? 'যানবাহন অনুযায়ী ভাড়ার তালিকা' : 'Fare Table by Mode'}
          </h2>
          <span className="text-xs font-semibold text-bad">
            Fares are approximate
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs tabular-nums">
            <thead>
              <tr className="border-b border-rule text-muted">
                <th className="py-2 pr-3 font-semibold">Mode</th>
                <th className="py-2 pr-3 font-semibold">Fare rule</th>
                <th className="py-2 font-semibold">Speed · wait</th>
              </tr>
            </thead>
            <tbody>
              {MODE_ORDER.map((modeKey) => {
                const cfg = network.modes[modeKey];
                const note = network.fareNotes[modeKey];
                const isWalk = modeKey === 'walk';
                return (
                  <tr key={modeKey} className="border-t border-rule">
                    <td className="py-2.5 pr-3 align-top">
                      <span className="inline-flex items-center gap-2 font-semibold text-ink">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-[6px] font-display text-[10px] font-extrabold ${
                            isWalk ? 'border border-dashed' : 'text-white'
                          }`}
                          style={
                            isWalk
                              ? {
                                  borderColor: getModeColor(modeKey),
                                  color: getModeColor(modeKey),
                                }
                              : { backgroundColor: getModeColor(modeKey) }
                          }
                        >
                          {cfg.tag}
                        </span>
                        <span>{cfg.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 align-top text-ink">{note}</td>
                    <td className="py-2.5 align-top whitespace-nowrap text-muted">
                      {cfg.speed}
                      {cfg.peak ? `/${cfg.peak}` : ''} km/h · {cfg.wait} min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          Fares are approximate. {network.note} Always check official railway,
          metro, or operator counters before travel.
        </p>
      </section>
    </div>
  );
};
