import { PortfolioSnapshot } from '../store/usePortfolioSnapshotsStore';

export type TrendRange = '7d' | '30d' | 'all';

export interface TrendDelta {
  currentUsd: number;
  previousUsd: number | null;
  changeUsd: number;
  changePercent: number | null;
}

export interface TrendChartPoint {
  x: string;
  y: number;
  capturedAt: number;
}

const RANGE_MS: Record<Exclude<TrendRange, 'all'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function filterSnapshotsByRange(
  snapshots: PortfolioSnapshot[],
  range: TrendRange,
  now = Date.now()
): PortfolioSnapshot[] {
  const sorted = [...snapshots].sort((a, b) => a.capturedAt - b.capturedAt);
  if (range === 'all') return sorted;
  const minTime = now - RANGE_MS[range];
  return sorted.filter((snapshot) => snapshot.capturedAt >= minTime);
}

export function calculateTrendDelta(
  snapshots: PortfolioSnapshot[],
  range: TrendRange,
  now = Date.now()
): TrendDelta | null {
  const rangeSnapshots = filterSnapshotsByRange(snapshots, range, now);
  if (rangeSnapshots.length === 0) return null;

  const first = rangeSnapshots[0];
  const latest = rangeSnapshots[rangeSnapshots.length - 1];
  const changeUsd = latest.totalUsd - first.totalUsd;
  const changePercent = first.totalUsd > 0 ? (changeUsd / first.totalUsd) * 100 : null;

  return {
    currentUsd: latest.totalUsd,
    previousUsd: rangeSnapshots.length > 1 ? first.totalUsd : null,
    changeUsd,
    changePercent,
  };
}

export function buildTrendChartData(
  snapshots: PortfolioSnapshot[],
  range: TrendRange,
  now = Date.now()
): TrendChartPoint[] {
  return filterSnapshotsByRange(snapshots, range, now).map((snapshot) => ({
    x: new Date(snapshot.capturedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    y: snapshot.totalUsd,
    capturedAt: snapshot.capturedAt,
  }));
}
