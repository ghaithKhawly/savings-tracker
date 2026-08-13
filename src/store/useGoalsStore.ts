import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AssetType } from './useAssetsStore';

export interface SavingsGoal {
  id: string;
  title: string;
  targetUsd: number;
  assetTypes: AssetType[] | 'ALL';
  dueDate?: number;
  targetDate?: number;
  monthlyContributionUsd?: number;
  createdAt: number;
  completedAt?: number;
  note?: string;
}

export interface GoalPayload {
  title: string;
  targetUsd: number;
  assetTypes: AssetType[] | 'ALL';
  dueDate?: number;
  targetDate?: number;
  monthlyContributionUsd?: number;
  note?: string;
}

interface GoalsState {
  goals: SavingsGoal[];
  addGoal: (payload: GoalPayload) => void;
  updateGoal: (goal: SavingsGoal) => void;
  removeGoal: (id: string) => void;
  replaceGoals: (goals: SavingsGoal[]) => void;
  clearGoals: () => void;
}

function generateId() {
  return `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const isWeb = Platform.OS === 'web';

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      goals: [],
      addGoal: (payload) => {
        const goal: SavingsGoal = {
          id: generateId(),
          title: payload.title.trim(),
          targetUsd: payload.targetUsd,
          assetTypes: payload.assetTypes,
          dueDate: payload.dueDate,
          targetDate: payload.targetDate,
          monthlyContributionUsd: payload.monthlyContributionUsd,
          note: payload.note?.trim() || undefined,
          createdAt: Date.now(),
        };

        set((state) => ({ goals: [goal, ...state.goals] }));
      },
      updateGoal: (goal) => {
        set((state) => ({
          goals: state.goals.map((item) => (item.id === goal.id ? goal : item)),
        }));
      },
      removeGoal: (id) => {
        set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) }));
      },
      replaceGoals: (goals) => set({ goals }),
      clearGoals: () => set({ goals: [] }),
    }),
    {
      name: 'goals-storage',
      storage: createJSONStorage(() => (isWeb ? localStorage : AsyncStorage)),
    }
  )
);

export default useGoalsStore;
