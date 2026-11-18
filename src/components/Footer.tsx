import React from 'react';
import type { LangKey, TabKey } from '../types';
import { Bus, Ship, TrainFront, TramFront } from './Icons';

interface FooterProps {
  onSelectTab: (tab: TabKey) => void;
  lang: LangKey;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, lang }) => {
  return (
    <footer className="mt-auto w-full bg-surface-container-low pb-20 sm:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:px-6 lg:px-10">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <span className="font-display text-base font-bold text-on-surface">
              Kom Khoroch
            </span>
            <span className="text-xs font-bold text-secondary">কম খরচ</span>
            <span className="rounded bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-fixed">
              সবচেয়ে সাশ্রয়ী
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            {lang === 'bn'
              ? 'কলকাতা ও হুগলি জুড়ে মেট্রো, লোকাল ট্রেন, বাস, ফেরি এবং শেয়ার অটোর সাশ্রয়ী রুট গাইড।'
              : 'Smart multi-modal transit planner covering Metro, Local Trains, Buses, Ferries & Shared Autos across Kolkata & Hooghly.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <TramFront
              className="h-3.5 w-3.5"
              style={{ color: 'var(--c-blue)' }}
              aria-hidden="true"
            />
            <span>Metro Lines</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bus
              className="h-3.5 w-3.5"
              style={{ color: 'var(--c-bus)' }}
              aria-hidden="true"
            />
            <span>WBTC &amp; Bus</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ship
              className="h-3.5 w-3.5"
              style={{ color: 'var(--c-ferry)' }}
              aria-hidden="true"
            />
            <span>Hooghly Ferries</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrainFront
              className="h-3.5 w-3.5"
              style={{ color: 'var(--c-rail)' }}
              aria-hidden="true"
            />
            <span>Suburban Local Rail</span>
          </span>
        </div>
      </div>

      <div className="bg-surface-container-high py-2">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-center text-xs font-semibold text-on-surface-variant sm:flex-row md:px-6 lg:px-10">
          <span>Kom Khoroch Kolkata · Fares are approximate</span>
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={() => onSelectTab('about')}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2.5 transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            >
              Fare Matrix
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('saved')}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2.5 transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            >
              Saved Routes
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('plan')}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2.5 transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            >
              Route Planner
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
