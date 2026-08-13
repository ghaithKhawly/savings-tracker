import { PortfolioSnapshot } from '../../store/usePortfolioSnapshotsStore';
import { buildTrendChartData, calculateTrendDelta, filterSnapshotsByRange } from '../trends';

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 0, 31);

function snapshot(id: string, daysAgo: number, totalUsd: number): PortfolioSnapshot {
  return {
    id,
    capturedAt: now - daysAgo * day,
    totalUsd,
    prices: {
      usdToSyp: 100,
      goldPerGram: 50,
      silverPerGram: 1,
      lastUpdated: now - daysAgo * day,
    },
  };
}

describe('trend utilities', () => {
  it('filters snapshots by range without backfilling fake data', () => {
    const snapshots = [snapshot('old', 40, 50), snapshot('recent', 3, 100)];

    expect(filterSnapshotsByRange(snapshots, '7d', now).map((item) => item.id)).toEqual(['recent']);
  });

  it('calculates value and percentage deltas', () => {
    const delta = calculateTrendDelta([snapshot('start', 6, 100), snapshot('end', 1, 125)], '7d', now);

    expect(delta?.changeUsd).toBe(25);
    expect(delta?.changePercent).toBe(25);
  });

  it('returns null when there are no snapshots in range', () => {
    expect(calculateTrendDelta([snapshot('old', 40, 50)], '7d', now)).toBeNull();
  });

  it('builds chart data from actual snapshots only', () => {
    const chartData = buildTrendChartData([snapshot('one', 2, 80), snapshot('two', 1, 90)], '7d', now);

    expect(chartData).toHaveLength(2);
    expect(chartData.map((point) => point.y)).toEqual([80, 90]);
  });
});
