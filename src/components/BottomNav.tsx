import React from 'react';
import type { LangKey, TabKey } from '../types';
import { Bookmark, Info, Route } from './Icons';

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
    icon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      key: 'plan',
      label: lang === 'bn' ? 'রুট' : 'Plan',
      icon: () => <Route className="h-5 w-5" aria-hidden="true" />,
    },
    {
      key: 'saved',
      label:
        lang === 'bn'
          ? `সংরক্ষিত${savedCount > 0 ? ` (${savedCount})` : ''}`
          : `Saved${savedCount > 0 ? ` (${savedCount})` : ''}`,
      icon: (active) => (
        <Bookmark
          className={`h-5 w-5 ${active ? 'fill-current' : ''}`}
          aria-hidden="true"
        />
      ),
    },
    {
      key: 'about',
      label: lang === 'bn' ? 'সম্পর্কে' : 'About',
      icon: () => <Info className="h-5 w-5" aria-hidden="true" />,
    },
  ];

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/40 bg-surface-container-lowest/95 backdrop-blur-lg sm:hidden"
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-3">
        {items.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold whitespace-nowrap transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary"
                  aria-hidden="true"
                />
              )}
              {item.icon(active)}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
