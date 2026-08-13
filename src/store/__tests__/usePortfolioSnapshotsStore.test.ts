import { usePortfolioSnapshotsStore } from '../usePortfolioSnapshotsStore';
import { PriceData } from '../../services/priceService';

const prices: PriceData = {
  usdToSyp: 100,
  goldPerGram: 50,
  silverPerGram: 1,
  lastUpdated: 1,
};

describe('usePortfolioSnapshotsStore', () => {
  beforeEach(() => {
    usePortfolioSnapshotsStore.setState({ snapshots: [] });
  });

  it('records snapshots newest first', () => {
    usePortfolioSnapshotsStore.getState().recordSnapshot(100, prices, 1);
    usePortfolioSnapshotsStore.getState().recordSnapshot(200, prices, 3_600_001);

    expect(usePortfolioSnapshotsStore.getState().snapshots.map((item) => item.totalUsd)).toEqual([200, 100]);
  });

  it('updates the latest snapshot within the minimum interval', () => {
    usePortfolioSnapshotsStore.getState().recordSnapshot(100, prices, 1_000);
    usePortfolioSnapshotsStore.getState().recordSnapshot(120, prices, 2_000);

    expect(usePortfolioSnapshotsStore.getState().snapshots).toHaveLength(1);
    expect(usePortfolioSnapshotsStore.getState().snapshots[0].totalUsd).toBe(120);
  });

  it('caps snapshots at 365 entries', () => {
    for (let index = 0; index < 370; index += 1) {
      usePortfolioSnapshotsStore.getState().recordSnapshot(index, prices, index * 3_600_001);
    }

    expect(usePortfolioSnapshotsStore.getState().snapshots).toHaveLength(365);
  });

  it('replaces sorted snapshots and clears them', () => {
    usePortfolioSnapshotsStore.getState().replaceSnapshots([
      { id: 'old', capturedAt: 1, totalUsd: 1, prices },
      { id: 'new', capturedAt: 2, totalUsd: 2, prices },
    ]);

    expect(usePortfolioSnapshotsStore.getState().snapshots[0].id).toBe('new');
    usePortfolioSnapshotsStore.getState().clearSnapshots();
    expect(usePortfolioSnapshotsStore.getState().snapshots).toHaveLength(0);
  });
});
