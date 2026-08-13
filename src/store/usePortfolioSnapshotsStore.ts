import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PriceData } from '../services/priceService';

export interface PortfolioSnapshot {
  id: string;
  capturedAt: number;
  totalUsd: number;
  prices: PriceData;
}

interface PortfolioSnapshotsState {
  snapshots: PortfolioSnapshot[];
  recordSnapshot: (totalUsd: number, prices: PriceData, capturedAt?: number) => void;
  replaceSnapshots: (snapshots: PortfolioSnapshot[]) => void;
  clearSnapshots: () => void;
  getSnapshots: () => PortfolioSnapshot[];
}

const MAX_SNAPSHOTS = 365;
const MIN_SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;

function generateId(timestamp: number) {
  return `snap-${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const isWeb = Platform.OS === 'web';

export const usePortfolioSnapshotsStore = create<PortfolioSnapshotsState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      recordSnapshot: (totalUsd, prices, capturedAt = Date.now()) => {
        if (!Number.isFinite(totalUsd) || totalUsd < 0) return;

        const latest = get().snapshots[0];
        if (latest && capturedAt - latest.capturedAt < MIN_SNAPSHOT_INTERVAL_MS) {
          set((state) => ({
            snapshots: [
              { ...latest, capturedAt, totalUsd, prices },
              ...state.snapshots.slice(1),
            ],
          }));
          return;
        }

        const snapshot: PortfolioSnapshot = {
          id: generateId(capturedAt),
          capturedAt,
          totalUsd,
          prices,
        };

        set((state) => ({
          snapshots: [snapshot, ...state.snapshots].slice(0, MAX_SNAPSHOTS),
        }));
      },
      replaceSnapshots: (snapshots) => {
        set({
          snapshots: [...snapshots]
            .sort((a, b) => b.capturedAt - a.capturedAt)
            .slice(0, MAX_SNAPSHOTS),
        });
      },
      clearSnapshots: () => set({ snapshots: [] }),
      getSnapshots: () => get().snapshots,
    }),
    {
      name: 'portfolio-snapshots-storage',
      storage: createJSONStorage(() => (isWeb ? localStorage : AsyncStorage)),
    }
  )
);

export default usePortfolioSnapshotsStore;
