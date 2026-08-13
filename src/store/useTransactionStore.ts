import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AssetType } from './useAssetsStore';

export type TransactionType = 'ADD' | 'REMOVE' | 'UPDATE';

export interface Transaction {
  id: string;
  type: TransactionType;
  assetType: AssetType;
  amount: number;
  previousAmount?: number; // For UPDATE transactions
  note?: string;
  createdAt: number;
  assetId?: string; // Reference to the asset
}

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  replaceTransactions: (transactions: Transaction[]) => void;
  clearTransactions: () => void;
  getTransactionsByAssetType: (type: AssetType) => Transaction[];
  getRecentTransactions: (limit?: number) => Transaction[];
}

function generateId() {
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const isWeb = Platform.OS === 'web';

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      
      addTransaction: (transactionData) => {
        const transaction: Transaction = {
          id: generateId(),
          ...transactionData,
          createdAt: Date.now(),
        };
        set((state) => ({ 
          transactions: [transaction, ...state.transactions].slice(0, 500) // Keep last 500 transactions
        }));
      },

      replaceTransactions: (transactions) => set({ transactions: transactions.slice(0, 500) }),
      
      clearTransactions: () => set({ transactions: [] }),
      
      getTransactionsByAssetType: (type: AssetType) => {
        return get().transactions.filter((tx) => tx.assetType === type);
      },
      
      getRecentTransactions: (limit = 20) => {
        return get().transactions.slice(0, limit);
      },
    }),
    {
      name: 'transactions-storage',
      storage: createJSONStorage(() => (isWeb ? localStorage : AsyncStorage)),
    }
  )
);

// Helper function to log asset changes
export function logAssetTransaction(
  type: TransactionType,
  assetType: AssetType,
  amount: number,
  options?: {
    previousAmount?: number;
    note?: string;
    assetId?: string;
  }
) {
  useTransactionStore.getState().addTransaction({
    type,
    assetType,
    amount,
    previousAmount: options?.previousAmount,
    note: options?.note,
    assetId: options?.assetId,
  });
}

export default useTransactionStore;
