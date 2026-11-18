import type { NetworkData, PlanTripResult, Stop, TransitLine, TripOptions } from './types';

export interface Planner {
  planTrip: (
    from: string,
    to: string,
    opts?: Partial<TripOptions>
  ) => PlanTripResult;
  findStop: (text: string) => string | null;
  stops: Stop[];
  lines: TransitLine[];
}

export declare const PRESETS: { cheapest: number; fastest: number };
export declare function haversineKm(a: Stop, b: Stop): number;
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
