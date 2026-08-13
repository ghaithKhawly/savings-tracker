import { Asset, AssetType } from '../store/useAssetsStore';
import { SavingsGoal } from '../store/useGoalsStore';
import { PriceData } from '../services/priceService';
import { calculateTotalUsd } from './assetCalculations';

export interface GoalProgress {
  goal: SavingsGoal;
  currentUsd: number;
  progress: number;
  remainingUsd: number;
  isComplete: boolean;
  projectedCompletionDate?: number;
  neededMonthlyUsd?: number;
  monthsRemaining?: number;
}

export function getGoalAssets(goal: SavingsGoal, assets: Asset[]): Asset[] {
  if (goal.assetTypes === 'ALL') return assets;
  const allowedTypes = new Set<AssetType>(goal.assetTypes);
  return assets.filter((asset) => allowedTypes.has(asset.type));
}

export function calculateGoalProgress(
  goal: SavingsGoal,
  assets: Asset[],
  prices: PriceData | null
): GoalProgress {
  const currentUsd = prices ? calculateTotalUsd(getGoalAssets(goal, assets), prices) ?? 0 : 0;
  const targetUsd = Math.max(goal.targetUsd, 0);
  const progress = targetUsd > 0 ? Math.min(100, (currentUsd / targetUsd) * 100) : 0;
  const remainingUsd = Math.max(0, targetUsd - currentUsd);
  const targetDate = goal.targetDate ?? goal.dueDate;
  const monthsRemaining = targetDate ? getMonthsUntil(targetDate) : undefined;
  const monthlyContributionUsd = Math.max(goal.monthlyContributionUsd ?? 0, 0);

  return {
    goal,
    currentUsd,
    progress,
    remainingUsd,
    isComplete: Boolean(goal.completedAt) || (targetUsd > 0 && currentUsd >= targetUsd),
    projectedCompletionDate:
      remainingUsd > 0 && monthlyContributionUsd > 0
        ? addMonths(Date.now(), Math.ceil(remainingUsd / monthlyContributionUsd))
        : undefined,
    neededMonthlyUsd:
      remainingUsd > 0 && monthsRemaining && monthsRemaining > 0
        ? remainingUsd / monthsRemaining
        : undefined,
    monthsRemaining,
  };
}

export function summarizeGoals(
  goals: SavingsGoal[],
  assets: Asset[],
  prices: PriceData | null,
  limit?: number
): GoalProgress[] {
  const progress = goals.map((goal) => calculateGoalProgress(goal, assets, prices));
  const sorted = progress.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
    return b.progress - a.progress;
  });

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export function normalizeGoalAssetTypes(assetTypes: AssetType[] | 'ALL'): AssetType[] | 'ALL' {
  if (assetTypes === 'ALL') return 'ALL';
  const unique = Array.from(new Set(assetTypes));
  return unique.length === 0 || unique.length === 4 ? 'ALL' : unique;
}

export function applyWhatIfToGoal(
  progress: GoalProgress,
  simulatedUsd: number
): GoalProgress {
  const nextCurrentUsd = Math.max(0, progress.currentUsd + simulatedUsd);
  const targetUsd = Math.max(progress.goal.targetUsd, 0);
  const remainingUsd = Math.max(0, targetUsd - nextCurrentUsd);
  const monthlyContributionUsd = Math.max(progress.goal.monthlyContributionUsd ?? 0, 0);

  return {
    ...progress,
    currentUsd: nextCurrentUsd,
    progress: targetUsd > 0 ? Math.min(100, (nextCurrentUsd / targetUsd) * 100) : 0,
    remainingUsd,
    isComplete: progress.isComplete || (targetUsd > 0 && nextCurrentUsd >= targetUsd),
    projectedCompletionDate:
      remainingUsd > 0 && monthlyContributionUsd > 0
        ? addMonths(Date.now(), Math.ceil(remainingUsd / monthlyContributionUsd))
        : undefined,
  };
}

function getMonthsUntil(timestamp: number, now = Date.now()): number {
  const diff = timestamp - now;
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (30.4375 * 24 * 60 * 60 * 1000)));
}

function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}
