import React from 'react';
import type { LangKey, TabKey, ThemeKey } from '../types';
import { BrandCrest, Moon, Sun } from './Icons';

interface HeaderProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  theme: ThemeKey;
  onToggleTheme: () => void;
  lang: LangKey;
  onSetLang: (lang: LangKey) => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  lang,
  onSetLang,
  savedCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-xl shadow-[var(--shadow-sm)] border-b border-outline-variant/30">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 md:px-6 lg:px-10">
        {/* Zone 1: Brand Crest + Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('plan')}
          className="flex min-h-[40px] shrink-0 items-center gap-2.5 text-left whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <BrandCrest className="h-8 w-8 shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-base font-extrabold tracking-tight text-primary sm:text-lg">
                Kom Khoroch
              </span>
              <span className="text-xs font-bold text-secondary">কম খরচ</span>
            </div>
            <span className="hidden text-[11px] font-medium text-on-surface-variant sm:block">
              Lowest Fare Route Planner
            </span>
          </div>
        </button>

        {/* Zone 2: Primary Desktop Nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 sm:flex md:gap-2"
        >
          {(['plan', 'saved', 'about'] as TabKey[]).map((tab) => {
            const active = activeTab === tab;
            const label =
              tab === 'plan'
                ? lang === 'bn'
                  ? 'রুট'
                  : 'Plan'
                : tab === 'saved'
                  ? lang === 'bn'
                    ? `সংরক্ষিত${savedCount > 0 ? ` (${savedCount})` : ''}`
                    : `Saved${savedCount > 0 ? ` (${savedCount})` : ''}`
                  : lang === 'bn'
                    ? 'তথ্য'
                    : 'About';
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[40px] rounded-lg px-4 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  active
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-[var(--shadow-sm)]'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Language Segmented Toggle + Theme Switch */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label="Language switcher"
            className="flex items-center rounded-lg bg-surface-container-low p-1"
          >
            <button
              type="button"
              onClick={() => onSetLang('en')}
              aria-pressed={lang === 'en'}
              className={`min-h-[32px] rounded px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                lang === 'en'
                  ? 'bg-surface-container-lowest text-on-surface shadow-[var(--shadow-sm)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onSetLang('bn')}
              aria-pressed={lang === 'bn'}
              className={`min-h-[32px] rounded px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                lang === 'bn'
                  ? 'bg-surface-container-lowest text-on-surface shadow-[var(--shadow-sm)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              বাংলা
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            className="grid h-9 w-9 place-items-center rounded-lg bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
