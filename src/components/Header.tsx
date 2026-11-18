import React from 'react';
import type { LangKey, TabKey, ThemeKey } from '../types';
import { MoonIcon, SunIcon } from './Icons';

interface HeaderProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  theme: ThemeKey;
  onToggleTheme: () => void;
  lang: LangKey;
  onToggleLang: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  lang,
  onToggleLang,
  savedCount,
}) => {
  return (
    <header className="relative z-30 border-b border-rule bg-surface/95 backdrop-blur-sm sm:sticky sm:top-0">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <button
          type="button"
          onClick={() => onSelectTab('plan')}
          className="flex min-h-[40px] shrink-0 items-center gap-2.5 text-left whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563C9]"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-accent font-display text-xs font-extrabold text-[#141B2D]"
            aria-hidden="true"
          >
            KK
          </span>
          <span className="font-display text-base font-extrabold tracking-tight text-ink sm:text-lg">
            {lang === 'bn' ? 'কম খরচ' : 'Kom Khoroch'}
          </span>
        </button>

        <nav className="hidden items-center gap-6 sm:flex" aria-label="Primary">
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
                className={`min-h-[40px] whitespace-nowrap border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563C9] ${
                  active
                    ? 'border-accent text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            aria-label="Toggle English or Bengali labels"
            className="min-h-[36px] whitespace-nowrap rounded-lg border border-rule bg-bg px-3 text-xs font-semibold text-ink transition-colors hover:border-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            {lang === 'en' ? 'বাংলা' : 'EN'}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="grid h-9 w-9 place-items-center rounded-lg border border-rule bg-bg text-ink transition-colors hover:border-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563C9]"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
};
