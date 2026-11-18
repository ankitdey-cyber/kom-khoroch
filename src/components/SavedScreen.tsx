import React from 'react';
import type { LangKey, SavedCommute } from '../types';
import { formatRupee } from '../utils/transit';
import { ArrowRightIcon, BookmarkIcon, TrashIcon } from './Icons';

interface SavedScreenProps {
  saved: SavedCommute[];
  onReplan: (item: SavedCommute) => void;
  onDelete: (id: string) => void;
  onGoToPlan: () => void;
  lang: LangKey;
}

export const SavedScreen: React.FC<SavedScreenProps> = ({
  saved,
  onReplan,
  onDelete,
  onGoToPlan,
  lang,
}) => {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <section className="rounded-[12px] border border-rule bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">
              {lang === 'bn' ? 'সংরক্ষিত যাতায়াত' : 'Saved Commutes'}
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              {lang === 'bn'
                ? 'ট্যাপ করে সরাসরি বর্তমান ভাড়া ও সময় দেখুন'
                : 'Tap any saved route to re-plan with current conditions.'}
            </p>
          </div>
          <span className="font-display text-xs font-bold text-muted tabular-nums">
            {saved.length} {saved.length === 1 ? 'route' : 'routes'}
          </span>
        </div>
      </section>

      {saved.length === 0 ? (
        <section className="grid place-items-center gap-3 rounded-[12px] border border-rule bg-surface p-8 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-bg text-muted">
            <BookmarkIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              No saved commutes yet
            </h2>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Open any route detail from the Plan screen and tap Save commute to
              keep your daily journeys here.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToPlan}
            className="min-h-[40px] rounded-[8px] bg-ink px-4 py-2 text-xs font-semibold text-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            Plan a commute
          </button>
        </section>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {saved.map((item) => {
            const metaParts = [
              item.options.peak ? 'Peak hour' : 'Off-peak',
              item.options.smartCard ? 'Smart card' : null,
              item.options.avoid.length > 0
                ? `Avoid ${item.options.avoid.join(', ')}`
                : null,
            ].filter(Boolean);

            return (
              <li
                key={item.id}
                className="rounded-[12px] border border-rule bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onReplan(item)}
                    className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
                  >
                    <div className="font-display text-base font-extrabold text-ink">
                      {item.fromName} → {item.toName}
                    </div>
                    <div className="mt-1 text-xs font-medium text-muted">
                      {item.modeSummary}
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      {metaParts.join(' · ')}
                    </div>
                  </button>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="text-right tabular-nums">
                      <div className="font-display text-xl font-extrabold leading-none text-ink">
                        {formatRupee(item.lastFare)}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        ~{item.lastMinutes} min
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Delete saved commute ${item.fromName} to ${item.toName}`}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-[8px] border border-rule bg-bg px-2.5 py-1 text-xs font-medium text-muted hover:border-bad hover:text-bad focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 border-t border-rule pt-2.5">
                  <button
                    type="button"
                    onClick={() => onReplan(item)}
                    className="inline-flex min-h-[36px] items-center gap-1 font-display text-xs font-bold text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
                  >
                    <span>Tap to re-plan</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-xs text-muted">
        Saved fares are approximate snapshots; tapping re-plan recalculates
        current options.
      </p>
    </div>
  );
};
