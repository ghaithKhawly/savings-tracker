import { Asset } from '../../store/useAssetsStore';
import { SavingsGoal } from '../../store/useGoalsStore';
import { PriceData } from '../../services/priceService';
import { applyWhatIfToGoal, calculateGoalProgress, normalizeGoalAssetTypes, summarizeGoals } from '../goals';

const prices: PriceData = {
  usdToSyp: 100,
  goldPerGram: 50,
  silverPerGram: 1,
  lastUpdated: Date.UTC(2026, 0, 1),
};

const assets: Asset[] = [
  { id: 'usd', type: 'USD', amount: 100, createdAt: Date.UTC(2026, 0, 1) },
  { id: 'gold', type: 'GOLD', amount: 2, createdAt: Date.UTC(2026, 0, 1) },
  { id: 'syp', type: 'SYP', amount: 5000, createdAt: Date.UTC(2026, 0, 1) },
];

const goal: SavingsGoal = {
  id: 'goal',
  title: 'Emergency',
  targetUsd: 300,
  assetTypes: 'ALL',
  createdAt: Date.UTC(2026, 0, 1),
};

describe('goal utilities', () => {
  it('calculates all-asset progress from current portfolio value', () => {
    const progress = calculateGoalProgress(goal, assets, prices);

    expect(progress.currentUsd).toBe(250);
    expect(progress.progress).toBeCloseTo(83.333, 2);
    expect(progress.remainingUsd).toBe(50);
    expect(progress.isComplete).toBe(false);
  });

  it('filters goal progress by asset type', () => {
    const progress = calculateGoalProgress({ ...goal, assetTypes: ['GOLD'] }, assets, prices);

    expect(progress.currentUsd).toBe(100);
    expect(progress.remainingUsd).toBe(200);
  });

  it('treats completed goals as complete even below target', () => {
    const progress = calculateGoalProgress({ ...goal, completedAt: Date.now() }, assets, prices);

    expect(progress.isComplete).toBe(true);
  });

  it('calculates contribution projections and needed monthly amount', () => {
    const targetDate = Date.now() + 90 * 24 * 60 * 60 * 1000;
    const progress = calculateGoalProgress(
      { ...goal, targetUsd: 500, monthlyContributionUsd: 100, targetDate },
      assets,
      prices
    );

    expect(progress.remainingUsd).toBe(250);
    expect(progress.projectedCompletionDate).toBeGreaterThan(Date.now());
    expect(progress.neededMonthlyUsd).toBeGreaterThan(0);

    const whatIf = applyWhatIfToGoal(progress, 200);
    expect(whatIf.progress).toBeCloseTo(90);
    expect(whatIf.remainingUsd).toBe(50);
  });

  it('summarizes active goals before completed goals', () => {
    const result = summarizeGoals(
      [
        { ...goal, id: 'done', completedAt: Date.now() },
        { ...goal, id: 'active', targetUsd: 500 },
      ],
      assets,
      prices
    );

    expect(result[0].goal.id).toBe('active');
  });

  it('normalizes empty or all-type filters to ALL', () => {
    expect(normalizeGoalAssetTypes([])).toBe('ALL');
    expect(normalizeGoalAssetTypes(['USD', 'SYP', 'GOLD', 'SILVER'])).toBe('ALL');
    expect(normalizeGoalAssetTypes(['USD', 'USD'])).toEqual(['USD']);
  });
});
