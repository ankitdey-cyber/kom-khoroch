import type {
  NearestStop,
  NetworkData,
  PlanTripResult,
  Stop,
  TransitLine,
  TripOptions,
} from './types';

export interface Planner {
  planTrip: (
    from: string | { lat: number; lng: number },
    to: string,
    opts?: Partial<TripOptions>
  ) => PlanTripResult;
  findStop: (text: string) => string | null;
  findNearestStops: (lat: number, lng: number, k?: number) => NearestStop[];
  stops: Stop[];
  lines: TransitLine[];
}

export declare const PRESETS: { cheapest: number; fastest: number };
export declare function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number;
export declare function fare(
  mode: string,
  km: number,
  opts?: { smartCard?: boolean; peak?: boolean }
): number;
export declare function minutes(
  modeCfg: NetworkData['modes'],
  mode: string,
  km: number,
  opts?: { peak?: boolean; includeWait?: boolean }
): number;
export declare function createPlanner(network: NetworkData): Planner;
