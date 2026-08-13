import { AppSettings } from '../../contexts/SettingsContext';
import { Asset } from '../../store/useAssetsStore';
import { Transaction } from '../../store/useTransactionStore';
import { SavingsGoal } from '../../store/useGoalsStore';
import { PortfolioSnapshot } from '../../store/usePortfolioSnapshotsStore';
import { createExportPayload, getImportPreview, validateImportPayload } from '../importExport';

const settings: AppSettings = {
  themeMode: 'dark',
  currencyDisplay: 'SYP',
  showCents: false,
  onboardingCompleted: true,
  pricePreference: 'live',
  hideBalances: false,
  privacyScreenEnabled: true,
  appLockEnabled: false,
  allocationTargets: {
    USD: 25,
    SYP: 10,
    GOLD: 55,
    SILVER: 10,
  },
};

const assets: Asset[] = [
  {
    id: 'asset-1',
    type: 'USD',
    amount: 125.5,
    createdAt: Date.UTC(2026, 0, 1),
    note: 'Emergency fund',
  },
];

const transactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'UPDATE',
    assetType: 'USD',
    amount: 125.5,
    previousAmount: 100,
    createdAt: Date.UTC(2026, 0, 2),
    assetId: 'asset-1',
  },
];

const goals: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'Emergency fund',
    targetUsd: 1000,
    assetTypes: 'ALL',
    createdAt: Date.UTC(2026, 0, 3),
  },
];

const snapshots: PortfolioSnapshot[] = [
  {
    id: 'snap-1',
    capturedAt: Date.UTC(2026, 0, 4),
    totalUsd: 125.5,
    prices: {
      usdToSyp: 14500,
      goldPerGram: 75,
      silverPerGram: 1,
      lastUpdated: Date.UTC(2026, 0, 4),
    },
  },
];

describe('import/export utilities', () => {
  it('creates the required export payload shape', () => {
    const payload = createExportPayload(
      assets,
      transactions,
      goals,
      snapshots,
      settings,
      '2.0.0',
      '2026-01-10T12:00:00.000Z'
    );

    expect(payload).toEqual({
      schemaVersion: 3,
      exportedAt: '2026-01-10T12:00:00.000Z',
      appVersion: '2.0.0',
      settings,
      assets,
      transactions,
      goals,
      snapshots,
    });
  });

  it('validates a full v2 import payload', () => {
    const imported = validateImportPayload({
      assets,
      transactions,
      goals,
      snapshots,
      settings,
    });

    expect(imported.assets).toEqual(assets);
    expect(imported.transactions).toEqual(transactions);
    expect(imported.goals).toEqual(goals);
    expect(imported.snapshots).toEqual(snapshots);
    expect(imported.settings).toEqual(settings);
  });

  it('preserves planning fields and creates import previews', () => {
    const imported = validateImportPayload({
      assets,
      transactions,
      goals: [
        {
          ...goals[0],
          monthlyContributionUsd: 125,
          targetDate: Date.UTC(2026, 5, 1),
        },
      ],
      snapshots,
      settings: {
        ...settings,
        hideBalances: true,
      },
    });

    expect(imported.goals[0].monthlyContributionUsd).toBe(125);
    expect(imported.goals[0].targetDate).toBe(Date.UTC(2026, 5, 1));
    expect(imported.settings?.hideBalances).toBe(true);
    expect(getImportPreview(imported)).toEqual({
      assets: 1,
      transactions: 1,
      goals: 1,
      snapshots: 1,
      hasSettings: true,
    });
  });

  it('accepts v1 imports without goals or snapshots', () => {
    const imported = validateImportPayload({
      assets,
      transactions,
      settings,
    });

    expect(imported.goals).toEqual([]);
    expect(imported.snapshots).toEqual([]);
  });

  it('rejects malformed assets before any caller can overwrite state', () => {
    expect(() =>
      validateImportPayload({
        assets: [{ id: 'bad', type: 'BTC', amount: 1, createdAt: Date.now() }],
        transactions: [],
      })
    ).toThrow('Asset 1 has an unsupported type.');
  });

  it('rejects malformed transactions before any caller can overwrite state', () => {
    expect(() =>
      validateImportPayload({
        assets: [],
        transactions: [{ id: 'bad', type: 'ADD', assetType: 'USD', amount: Number.NaN }],
      })
    ).toThrow('Transaction 1 has an invalid amount.');
  });

  it('keeps only supported settings fields', () => {
    const imported = validateImportPayload({
      assets: [],
      transactions: [],
      settings: {
        themeMode: 'dark',
        currencyDisplay: 'EUR',
        showCents: true,
      },
    });

    expect(imported.settings).toEqual({
      themeMode: 'dark',
      showCents: true,
    });
  });

  it('rejects malformed goals and snapshots', () => {
    expect(() =>
      validateImportPayload({
        assets: [],
        transactions: [],
        goals: [{ title: '', targetUsd: 100 }],
      })
    ).toThrow('Goal 1 is missing a title.');

    expect(() =>
      validateImportPayload({
        assets: [],
        transactions: [],
        snapshots: [{ totalUsd: 10, prices: {} }],
      })
    ).toThrow('Snapshot 1 has invalid prices.');
  });
});
