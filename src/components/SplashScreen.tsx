import React, { useEffect, useState } from 'react';
import { BrandCrest, Bus, Navigation, TrainFront, TramFront } from './Icons';

interface SplashScreenProps {
  onComplete: () => void;
}

const TRANSIT_MODES = [
  { key: 'bus', label: 'Bus', threshold: 15, Icon: Bus },
  { key: 'rail', label: 'Local Train', threshold: 40, Icon: TrainFront },
  { key: 'metro', label: 'Metro', threshold: 65, Icon: TramFront },
  { key: 'auto', label: 'Auto', threshold: 85, Icon: Navigation },
] as const;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(45);
  const [exiting, setExiting] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setProgress(100);
      const t = window.setTimeout(() => {
        setExiting(true);
        window.setTimeout(onComplete, 180);
      }, 650);
      return () => window.clearTimeout(t);
    }

    // Hold briefly at 45% for visual clarity, then glide cleanly to 100%
    let rafId = 0;
    let finishTimer = 0;
    let exitTimer = 0;

    const startTimer = window.setTimeout(() => {
      const startTime = performance.now();
      const duration = 1250;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        // Smooth ease-out cubic from 45 to 100
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(45 + eased * 55);
        setProgress(value);

        if (t < 1) {
          rafId = window.requestAnimationFrame(tick);
        } else {
          finishTimer = window.setTimeout(() => {
            setExiting(true);
            exitTimer = window.setTimeout(onComplete, 340);
          }, 220);
        }
      };

      rafId = window.requestAnimationFrame(tick);
    }, 520);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(exitTimer);
      window.cancelAnimationFrame(rafId);
    };
  }, [onComplete]);

  const handleDismiss = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(onComplete, 240);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Kom Khoroch"
      className={`fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#060c1a] via-[#0b162c] to-[#071122] px-6 py-10 text-slate-100 transition-opacity duration-300 ${
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Atmospheric Navy Backdrop, Dotted Route Lines & Kolkata Skyline Silhouette */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft Teal & Warm Gold Ambient Depth */}
        <div className="absolute left-1/2 top-[34%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/12 blur-[120px]" />
        <div className="absolute bottom-[-8rem] left-1/2 h-[20rem] w-[36rem] -translate-x-1/2 rounded-full bg-amber-400/8 blur-[130px]" />

        {/* Subtle Dotted Transit Route Lines */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* Faint Hooghly river ribbon */}
          <path
            d="M710 -20 C695 220 790 440 748 920"
            stroke="#14b8a6"
            strokeOpacity="0.06"
            strokeWidth="36"
            strokeLinecap="round"
          />

          {/* Dotted East-West Metro corridor (Howrah -> Sector V) */}
          <path
            d="M-40 490 C280 510 580 445 760 462 C980 482 1220 430 1480 452"
            stroke="#2dd4bf"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            strokeDasharray="4 9"
            strokeLinecap="round"
          />

          {/* Dotted North-South Blue Metro & Suburban Rail corridor */}
          <path
            d="M785 -20 C772 240 808 540 755 920"
            stroke="#38bdf8"
            strokeOpacity="0.16"
            strokeWidth="1.5"
            strokeDasharray="3 10"
            strokeLinecap="round"
          />

          {/* Dotted Hooghly-Serampore suburban rail arc */}
          <path
            d="M120 110 C380 260 620 355 960 325 C1150 308 1310 220 1480 175"
            stroke="#fbbf24"
            strokeOpacity="0.16"
            strokeWidth="1.25"
            strokeDasharray="3 9"
            strokeLinecap="round"
          />

          {/* Dotted South Kolkata bus/auto curve */}
          <path
            d="M180 760 C460 665 860 640 1320 705"
            stroke="#2dd4bf"
            strokeOpacity="0.14"
            strokeWidth="1.25"
            strokeDasharray="2 8"
            strokeLinecap="round"
          />

          {/* Minimal Static Transit Nodes */}
          <circle cx="430" cy="482" r="3" fill="#2dd4bf" fillOpacity="0.4" />
          <circle cx="760" cy="462" r="4" fill="#fbbf24" fillOpacity="0.55" />
          <circle
            cx="760"
            cy="462"
            r="10"
            stroke="#fbbf24"
            strokeOpacity="0.18"
            strokeWidth="1"
          />
          <circle cx="1095" cy="463" r="3" fill="#2dd4bf" fillOpacity="0.4" />
          <circle cx="786" cy="235" r="2.5" fill="#38bdf8" fillOpacity="0.35" />
          <circle cx="515" cy="312" r="2.5" fill="#fbbf24" fillOpacity="0.35" />
        </svg>

        {/* Faint Kolkata Skyline Silhouette with Howrah Bridge Cantilever */}
        <svg
          className="absolute inset-x-0 bottom-0 h-44 w-full sm:h-56"
          viewBox="0 0 1440 240"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          {/* Distant horizon haze */}
          <line
            x1="0"
            y1="212"
            x2="1440"
            y2="212"
            stroke="#5eead4"
            strokeOpacity="0.12"
            strokeWidth="1"
          />

          {/* Left skyline (Howrah Ghat & subtle colonial domes) */}
          <path
            d="M0 212 L0 184 L55 184 L55 170 L92 170 L92 186 L138 186 L138 162 L176 162 L176 190 L225 190 L225 175 L268 175 L268 212 Z"
            fill="#11223d"
            fillOpacity="0.65"
          />

          {/* Victoria Memorial dome silhouette on far right */}
          <path
            d="M1110 212 L1110 182 L1142 182 L1142 168 L1164 168 Q1185 138 1206 168 L1228 168 L1228 182 L1264 182 L1264 172 L1315 172 L1315 188 L1370 188 L1370 176 L1440 176 L1440 212 Z"
            fill="#11223d"
            fillOpacity="0.65"
          />
          {/* Shahid Minar subtle spire */}
          <path
            d="M1046 212 L1049 128 Q1054 120 1059 128 L1062 212 Z"
            fill="#152b4a"
            fillOpacity="0.6"
          />

          {/* Iconic Howrah Bridge (Rabindra Setu) Cantilever Steel Truss */}
          <g
            stroke="#5eead4"
            strokeOpacity="0.22"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Main bridge roadway deck */}
            <line x1="250" y1="192" x2="1030" y2="192" strokeWidth="2.2" />

            {/* Left Cantilever Tower */}
            <path d="M440 212 L456 84 L488 84 L504 212" strokeWidth="2.2" />
            <line x1="451" y1="126" x2="493" y2="126" />
            <line x1="446" y1="160" x2="498" y2="160" />
            <line x1="456" y1="84" x2="493" y2="126" />
            <line x1="488" y1="84" x2="451" y2="126" />
            <line x1="451" y1="126" x2="498" y2="160" />
            <line x1="493" y1="126" x2="446" y2="160" />

            {/* Right Cantilever Tower */}
            <path d="M776 212 L792 84 L824 84 L840 212" strokeWidth="2.2" />
            <line x1="787" y1="126" x2="829" y2="126" />
            <line x1="782" y1="160" x2="834" y2="160" />
            <line x1="792" y1="84" x2="829" y2="126" />
            <line x1="824" y1="84" x2="787" y2="126" />
            <line x1="787" y1="126" x2="834" y2="160" />
            <line x1="829" y1="126" x2="782" y2="160" />

            {/* Outer approach cantilever arms */}
            <path d="M275 192 L456 84" strokeWidth="2" />
            <path d="M824 84 L1005 192" strokeWidth="2" />

            {/* Central suspended arch chord */}
            <path d="M488 84 Q640 164 792 84" strokeWidth="2" />
            <path d="M488 84 L575 138 L705 138 L792 84" strokeOpacity="0.16" />

            {/* Truss web diagonals & vertical hangers */}
            <line x1="335" y1="156" x2="335" y2="192" />
            <line x1="392" y1="122" x2="392" y2="192" />
            <line x1="335" y1="156" x2="392" y2="192" />
            <line x1="392" y1="122" x2="444" y2="192" />

            <line x1="540" y1="120" x2="540" y2="192" />
            <line x1="590" y1="138" x2="590" y2="192" />
            <line x1="640" y1="142" x2="640" y2="192" />
            <line x1="690" y1="138" x2="690" y2="192" />
            <line x1="740" y1="120" x2="740" y2="192" />

            <line x1="504" y1="192" x2="540" y2="120" />
            <line x1="540" y1="120" x2="590" y2="192" />
            <line x1="590" y1="138" x2="640" y2="192" />
            <line x1="640" y1="142" x2="690" y2="192" />
            <line x1="690" y1="138" x2="740" y2="192" />
            <line x1="740" y1="120" x2="776" y2="192" />

            <line x1="888" y1="122" x2="888" y2="192" />
            <line x1="945" y1="156" x2="945" y2="192" />
            <line x1="888" y1="122" x2="836" y2="192" />
            <line x1="945" y1="156" x2="888" y2="192" />
          </g>

          {/* Subtle river reflection lines */}
          <line
            x1="440"
            y1="224"
            x2="840"
            y2="224"
            stroke="#2dd4bf"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="16 14"
          />
          <line
            x1="520"
            y1="233"
            x2="760"
            y2="233"
            stroke="#fbbf24"
            strokeOpacity="0.08"
            strokeWidth="1"
            strokeDasharray="10 18"
          />
        </svg>
      </div>

      {/* Centered Minimal Premium Content Column */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center sm:max-w-md">
        {/* Centered App Logo in Rounded Glassmorphism Card with Soft Teal Glow */}
        <div className="relative mb-9">
          <div
            className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-teal-400/20 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[1.75rem] border border-teal-200/20 bg-white/[0.06] p-3.5 shadow-[0_20px_50px_rgba(2,10,24,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:h-32 sm:w-32 sm:p-4">
            {logoError ? (
              <BrandCrest className="h-20 w-20 rounded-2xl" />
            ) : (
              <img
                src="/pwa-512x512.png"
                alt="Kom Khoroch app logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-full w-full rounded-[1.1rem] object-contain shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
              />
            )}
          </div>
        </div>

        {/* Brand Wordmark & Bangla Sub-title */}
        <div className="flex flex-col items-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white [text-wrap:balance] sm:text-5xl">
            Kom Khoroch
          </h1>

          <div className="mt-2.5 flex items-center gap-3">
            <span
              className="h-px w-7 bg-gradient-to-r from-transparent to-amber-300/60"
              aria-hidden="true"
            />
            <span className="font-display text-xl font-bold tracking-wide text-amber-300 sm:text-2xl">
              কম খরচ
            </span>
            <span
              className="h-px w-7 bg-gradient-to-l from-transparent to-amber-300/60"
              aria-hidden="true"
            />
          </div>

          <p className="mt-4 text-sm font-normal tracking-[0.01em] text-slate-300/85 sm:text-base">
            Cheapest way across Kolkata
          </p>
        </div>

        {/* Progress Module with Subtle Transit Mode Icons */}
        <div className="mt-14 w-full max-w-xs sm:max-w-sm">
          {/* Very subtle bus, train, metro, auto icons above the progress bar */}
          <div
            className="mb-3.5 flex items-center justify-between px-1"
            aria-hidden="true"
          >
            {TRANSIT_MODES.map(({ key, Icon, threshold }) => {
              const reached = progress >= threshold;
              return (
                <span
                  key={key}
                  className={`transition-colors duration-300 ${
                    reached ? 'text-teal-200/75' : 'text-slate-500/45'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              );
            })}
          </div>

          {/* Thin Rounded Progress Bar (Teal to Yellow Gradient) + Percentage Beside It */}
          <div className="flex items-center gap-3.5">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Route engine loading progress"
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/[0.06]"
            >
              <div
                className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-400 via-emerald-300 to-amber-300 transition-transform duration-150 ease-out"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>

            <span className="w-10 shrink-0 text-right text-xs font-semibold tracking-wider text-amber-200/95 tabular-nums">
              {progress}%
            </span>
          </div>

          {/* Small Status Text */}
          <p className="mt-3.5 text-xs font-medium tracking-[0.02em] text-slate-400">
            Finding cheapest routes…
          </p>
        </div>

        {/* Accessible Dismiss / Enter Affordance */}
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-4 py-2 text-xs font-medium tracking-wide text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          Skip
        </button>
      </div>
    </div>
  );
};
