import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { logAssetTransaction } from './useTransactionStore';

export type AssetType = 'USD' | 'SYP' | 'GOLD' | 'SILVER';

export interface Asset {
  id: string;
  type: AssetType;
  amount: number;
  createdAt: number;
  note?: string;
}

interface AddPayload {
  type: AssetType;
  amount: number;
  note?: string;
}

interface AssetsState {
  assets: Asset[];
  addAsset: (payload: AddPayload) => void;
  removeAsset: (id: string) => void;
  updateAsset: (asset: Asset) => void;
  replaceAssets: (assets: Asset[]) => void;
  clearAssets: () => void;
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const isWeb = Platform.OS === 'web';

export const useAssetsStore = create<AssetsState>()(
  persist(
    (set, get) => ({
      assets: [],
      addAsset: (payload: AddPayload) => {
        const asset: Asset = {
          id: generateId(),
          type: payload.type,
          amount: payload.amount,
          createdAt: Date.now(),
          note: payload.note,
        };
        set((state) => ({ assets: [asset, ...state.assets] }));
        
        // Log transaction
        logAssetTransaction('ADD', asset.type, asset.amount, {
          note: asset.note,
          assetId: asset.id,
        });
      },
      removeAsset: (id: string) => {
        const asset = get().assets.find((a) => a.id === id);
        if (asset) {
          // Log transaction before removing
          logAssetTransaction('REMOVE', asset.type, asset.amount, {
            note: asset.note,
            assetId: asset.id,
          });
        }
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
      },
      updateAsset: (asset: Asset) => {
        const previousAsset = get().assets.find((a) => a.id === asset.id);
        set((state) => ({ assets: state.assets.map((a) => (a.id === asset.id ? asset : a)) }));
        
        // Log transaction
        logAssetTransaction('UPDATE', asset.type, asset.amount, {
          previousAmount: previousAsset?.amount,
          note: asset.note,
          assetId: asset.id,
        });
      },
      replaceAssets: (assets: Asset[]) => set({ assets }),
      clearAssets: () => set({ assets: [] }),
    }),
    {
      name: 'assets-storage',
      storage: createJSONStorage(() => (isWeb ? localStorage : AsyncStorage)),
    }
  )
);

export default useAssetsStore;
