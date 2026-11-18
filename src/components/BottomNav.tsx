import React from 'react';
import type { LangKey, TabKey } from '../types';
import { BookmarkIcon, InfoIcon, PlanIcon } from './Icons';

interface BottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  savedCount: number;
  lang: LangKey;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  savedCount,
  lang,
}) => {
  const items: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'plan',
      label: lang === 'bn' ? 'রুট' : 'Plan',
      icon: <PlanIcon className="h-5 w-5" />,
    },
    {
      key: 'saved',
      label:
        lang === 'bn'
          ? `সংরক্ষিত${savedCount > 0 ? ` (${savedCount})` : ''}`
          : `Saved${savedCount > 0 ? ` (${savedCount})` : ''}`,
      icon: <BookmarkIcon className="h-5 w-5" filled={activeTab === 'saved'} />,
    },
    {
      key: 'about',
      label: lang === 'bn' ? 'সম্পর্কে' : 'About',
      icon: <InfoIcon className="h-5 w-5" />,
    },
  ];

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 backdrop-blur-sm sm:hidden"
    >
      <div className="mx-auto grid h-14 max-w-5xl grid-cols-3">
        {items.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9] ${
                active ? 'text-ink' : 'text-muted'
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 h-[3px] w-10 rounded-b-full bg-accent"
                  aria-hidden="true"
                />
              )}
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
