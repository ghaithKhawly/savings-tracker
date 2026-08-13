import { AppSettings } from '../contexts/SettingsContext';
import { Asset, AssetType } from '../store/useAssetsStore';
import { Transaction, TransactionType } from '../store/useTransactionStore';
import { SavingsGoal } from '../store/useGoalsStore';
import { PortfolioSnapshot } from '../store/usePortfolioSnapshotsStore';
import { PriceData } from '../services/priceService';

const ASSET_TYPES: AssetType[] = ['USD', 'SYP', 'GOLD', 'SILVER'];
const TRANSACTION_TYPES: TransactionType[] = ['ADD', 'REMOVE', 'UPDATE'];
const SCHEMA_VERSION = 3;

export interface SavingsTrackerExport {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  settings: AppSettings;
  assets: Asset[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  snapshots: PortfolioSnapshot[];
}

export interface ValidatedImportPayload {
  assets: Asset[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  snapshots: PortfolioSnapshot[];
  settings?: Partial<AppSettings>;
}

export interface ImportPreview {
  assets: number;
  transactions: number;
  goals: number;
  snapshots: number;
  hasSettings: boolean;
}

export function getImportPreview(payload: ValidatedImportPayload): ImportPreview {
  return {
    assets: payload.assets.length,
    transactions: payload.transactions.length,
    goals: payload.goals.length,
    snapshots: payload.snapshots.length,
    hasSettings: Boolean(payload.settings),
  };
}

function createImportId(prefix: string, index: number): string {
  return `${prefix}-${Date.now().toString(36)}-${index}`;
}

function readTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function validateSettings(raw: unknown): Partial<AppSettings> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const data = raw as Partial<AppSettings>;
  const settings: Partial<AppSettings> = {};

  if (data.themeMode === 'light' || data.themeMode === 'dark' || data.themeMode === 'system') {
    settings.themeMode = data.themeMode;
  }
  if (data.currencyDisplay === 'USD' || data.currencyDisplay === 'SYP') {
    settings.currencyDisplay = data.currencyDisplay;
  }
  if (typeof data.showCents === 'boolean') {
    settings.showCents = data.showCents;
  }
  if (typeof data.onboardingCompleted === 'boolean') {
    settings.onboardingCompleted = data.onboardingCompleted;
  }
  if (data.pricePreference === 'live' || data.pricePreference === 'cached' || data.pricePreference === 'demo') {
    settings.pricePreference = data.pricePreference;
  }
  if (typeof data.hideBalances === 'boolean') {
    settings.hideBalances = data.hideBalances;
  }
  if (typeof data.privacyScreenEnabled === 'boolean') {
    settings.privacyScreenEnabled = data.privacyScreenEnabled;
  }
  if (typeof data.appLockEnabled === 'boolean') {
    settings.appLockEnabled = data.appLockEnabled;
  }
  if (data.allocationTargets && typeof data.allocationTargets === 'object') {
    const rawTargets = data.allocationTargets as Partial<Record<AssetType, unknown>>;
    const allocationTargets: Partial<AppSettings['allocationTargets']> = {};
    ASSET_TYPES.forEach((type) => {
      const value = rawTargets[type];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        allocationTargets[type] = Math.min(100, value);
      }
    });
    if (Object.keys(allocationTargets).length > 0) {
      settings.allocationTargets = allocationTargets as AppSettings['allocationTargets'];
    }
  }

  return Object.keys(settings).length > 0 ? settings : undefined;
}

export function createExportPayload(
  assets: Asset[],
  transactions: Transaction[],
  goals: SavingsGoal[],
  snapshots: PortfolioSnapshot[],
  settings: AppSettings,
  appVersion: string,
  exportedAt = new Date().toISOString()
): SavingsTrackerExport {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    appVersion,
    settings,
    assets,
    transactions,
    goals,
    snapshots,
  };
}

function validateAsset(raw: unknown, index: number): Asset {
  const asset = raw as Partial<Asset>;
  if (!ASSET_TYPES.includes(asset.type as AssetType)) {
    throw new Error(`Asset ${index + 1} has an unsupported type.`);
  }
  if (typeof asset.amount !== 'number' || !Number.isFinite(asset.amount) || asset.amount < 0) {
    throw new Error(`Asset ${index + 1} has an invalid amount.`);
  }

  return {
    id: typeof asset.id === 'string' ? asset.id : createImportId('asset', index),
    type: asset.type as AssetType,
    amount: asset.amount,
    createdAt: readTimestamp(asset.createdAt),
    note: typeof asset.note === 'string' ? asset.note : undefined,
  };
}

function validateTransaction(raw: unknown, index: number): Transaction {
  const tx = raw as Partial<Transaction>;
  if (!TRANSACTION_TYPES.includes(tx.type as TransactionType)) {
    throw new Error(`Transaction ${index + 1} has an unsupported type.`);
  }
  if (!ASSET_TYPES.includes(tx.assetType as AssetType)) {
    throw new Error(`Transaction ${index + 1} has an unsupported asset type.`);
  }
  if (typeof tx.amount !== 'number' || !Number.isFinite(tx.amount)) {
    throw new Error(`Transaction ${index + 1} has an invalid amount.`);
  }

  return {
    id: typeof tx.id === 'string' ? tx.id : createImportId('tx', index),
    type: tx.type as TransactionType,
    assetType: tx.assetType as AssetType,
    amount: tx.amount,
    previousAmount: typeof tx.previousAmount === 'number' ? tx.previousAmount : undefined,
    note: typeof tx.note === 'string' ? tx.note : undefined,
    createdAt: readTimestamp(tx.createdAt),
    assetId: typeof tx.assetId === 'string' ? tx.assetId : undefined,
  };
}

function validateGoal(raw: unknown, index: number): SavingsGoal {
  const goal = raw as Partial<SavingsGoal>;
  if (typeof goal.title !== 'string' || goal.title.trim().length === 0) {
    throw new Error(`Goal ${index + 1} is missing a title.`);
  }
  if (typeof goal.targetUsd !== 'number' || !Number.isFinite(goal.targetUsd) || goal.targetUsd <= 0) {
    throw new Error(`Goal ${index + 1} has an invalid target.`);
  }

  let assetTypes: SavingsGoal['assetTypes'] = 'ALL';
  if (goal.assetTypes !== 'ALL') {
    if (!Array.isArray(goal.assetTypes)) {
      throw new Error(`Goal ${index + 1} has an invalid asset type filter.`);
    }
    const validTypes = goal.assetTypes.filter((type): type is AssetType => ASSET_TYPES.includes(type as AssetType));
    if (validTypes.length !== goal.assetTypes.length) {
      throw new Error(`Goal ${index + 1} has an unsupported asset type.`);
    }
    assetTypes = validTypes.length === 0 || validTypes.length === ASSET_TYPES.length ? 'ALL' : validTypes;
  }

  return {
    id: typeof goal.id === 'string' ? goal.id : createImportId('goal', index),
    title: goal.title.trim(),
    targetUsd: goal.targetUsd,
    assetTypes,
    dueDate: typeof goal.dueDate === 'number' && Number.isFinite(goal.dueDate) ? goal.dueDate : undefined,
    targetDate: typeof goal.targetDate === 'number' && Number.isFinite(goal.targetDate) ? goal.targetDate : undefined,
    monthlyContributionUsd:
      typeof goal.monthlyContributionUsd === 'number' &&
      Number.isFinite(goal.monthlyContributionUsd) &&
      goal.monthlyContributionUsd >= 0
        ? goal.monthlyContributionUsd
        : undefined,
    createdAt: readTimestamp(goal.createdAt),
    completedAt: typeof goal.completedAt === 'number' && Number.isFinite(goal.completedAt) ? goal.completedAt : undefined,
    note: typeof goal.note === 'string' ? goal.note : undefined,
  };
}

function validatePriceData(raw: unknown): PriceData | null {
  const data = raw as Partial<PriceData>;
  if (
    typeof data.usdToSyp !== 'number' ||
    typeof data.goldPerGram !== 'number' ||
    typeof data.silverPerGram !== 'number' ||
    !Number.isFinite(data.usdToSyp) ||
    !Number.isFinite(data.goldPerGram) ||
    !Number.isFinite(data.silverPerGram)
  ) {
    return null;
  }

  return {
    usdToSyp: data.usdToSyp,
    goldPerGram: data.goldPerGram,
    silverPerGram: data.silverPerGram,
    lastUpdated: readTimestamp(data.lastUpdated),
    isDemo: typeof data.isDemo === 'boolean' ? data.isDemo : undefined,
    source:
      data.source === 'live' ||
      data.source === 'cache' ||
      data.source === 'stale-cache' ||
      data.source === 'demo' ||
      data.source === 'manual'
        ? data.source
        : undefined,
  };
}

function validateSnapshot(raw: unknown, index: number): PortfolioSnapshot {
  const snapshot = raw as Partial<PortfolioSnapshot>;
  if (typeof snapshot.totalUsd !== 'number' || !Number.isFinite(snapshot.totalUsd) || snapshot.totalUsd < 0) {
    throw new Error(`Snapshot ${index + 1} has an invalid total.`);
  }
  const prices = validatePriceData(snapshot.prices);
  if (!prices) {
    throw new Error(`Snapshot ${index + 1} has invalid prices.`);
  }

  return {
    id: typeof snapshot.id === 'string' ? snapshot.id : createImportId('snap', index),
    capturedAt: readTimestamp(snapshot.capturedAt),
    totalUsd: snapshot.totalUsd,
    prices,
  };
}

export function validateImportPayload(raw: unknown): ValidatedImportPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Import must be a JSON object.');
  }

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.assets)) {
    throw new Error('Import is missing an assets array.');
  }
  if (!Array.isArray(data.transactions)) {
    throw new Error('Import is missing a transactions array.');
  }

  const assets: Asset[] = data.assets.map(validateAsset);
  const transactions: Transaction[] = data.transactions.map(validateTransaction);
  const goals: SavingsGoal[] = Array.isArray(data.goals) ? data.goals.map(validateGoal) : [];
  const snapshots: PortfolioSnapshot[] = Array.isArray(data.snapshots)
    ? data.snapshots.map(validateSnapshot).sort((a, b) => b.capturedAt - a.capturedAt).slice(0, 365)
    : [];

  return {
    assets,
    transactions,
    goals,
    snapshots,
    settings: validateSettings(data.settings),
  };
}
