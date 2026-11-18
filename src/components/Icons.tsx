import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bike,
  Bookmark,
  Bus,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Footprints,
  Gauge,
  HelpCircle,
  IndianRupee,
  Info,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Moon,
  Navigation,
  Plus,
  Route,
  Share2,
  Ship,
  Sparkles,
  Sun,
  TrainFront,
  TramFront,
  Trash2,
  TrendingDown,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type { ModeKey } from '../types';

export const BrandCrest: React.FC<{ className?: string }> = ({
  className = 'h-9 w-9',
}) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="10" fill="var(--primary-fixed)" />
    <path
      d="M7 27C12.5 24 17.5 24 23 27C27.5 29.5 31 28.5 34 26.5"
      stroke="var(--secondary)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M9 17.5H25L31 12.5"
      stroke="var(--primary)"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="17.5" r="3" fill="var(--primary)" />
    <circle cx="20" cy="17.5" r="3" fill="var(--secondary)" />
    <circle cx="31" cy="12.5" r="3" fill="var(--primary-container)" />
  </svg>
);

export const ModeIcon: React.FC<{ mode: ModeKey; className?: string }> = ({
  mode,
  className = 'h-4 w-4',
}) => {
  switch (mode) {
    case 'metro':
      return <TramFront className={className} aria-hidden="true" />;
    case 'rail':
      return <TrainFront className={className} aria-hidden="true" />;
    case 'bus':
      return <Bus className={className} aria-hidden="true" />;
    case 'auto':
      return <Navigation className={className} aria-hidden="true" />;
    case 'ferry':
      return <Ship className={className} aria-hidden="true" />;
    case 'bike':
      return <Bike className={className} aria-hidden="true" />;
    case 'cab':
      return <Car className={className} aria-hidden="true" />;
    case 'walk':
      return <Footprints className={className} aria-hidden="true" />;
  }
};

export {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bike,
  Bookmark,
  Bus,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Footprints,
  Gauge,
  HelpCircle,
  IndianRupee,
  Info,
  Lightbulb,
  MapIcon,
  MapPin,
  Moon,
  Navigation,
  Plus,
  Route,
  Share2,
  Ship,
  Sparkles,
  Sun,
  TrainFront,
  TramFront,
  Trash2,
  TrendingDown,
  Wallet,
  X,
  Zap,
};
