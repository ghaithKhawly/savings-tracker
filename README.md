# Savings Tracker

A cross-platform personal savings tracker built with Expo, React Native, and TypeScript. Track USD, SYP, gold, and silver; monitor total value with live/fallback prices; set local savings goals; review transaction history; and export/import your data.

## Features

- Multi-asset tracking for USD, SYP, gold, and silver.
- Live price conversion with fallback chain: fresh API, memory cache, persisted cache, demo prices.
- Dashboard control center with net worth, insights, goals preview, trend chart, distribution chart, values chart, rates, and recent activity.
- Asset workflow with add/edit/delete, search, filters, sort sheet, type summary chips, confirm delete, and undo window.
- Full transaction history with search, type/asset/date filters, JSON export, and CSV export.
- Local savings goals with target USD values, optional due dates, asset-type filters, completion state, and dashboard progress.
- Portfolio snapshots capped at 365 records for practical local trend tracking.
- Settings for theme mode, default display currency, decimals, JSON backup/restore, CSV exports, cache clearing, and destructive data reset.
- Persistent storage through Zustand and AsyncStorage/localStorage.
- Web, Android, and iOS support in Expo managed workflow.

## Tech Stack

- Expo + React Native + TypeScript
- React Navigation bottom tabs
- Zustand persisted stores
- Victory Native charts
- AsyncStorage and localStorage persistence
- Expo DocumentPicker, FileSystem, and Sharing for backup/export flows
- Jest + React Native Testing Library
- ESLint + Prettier

## Setup

```bash
npm install
```

Optional API keys can be configured through Expo app config extras or environment variables:

```bash
EXCHANGE_RATE_API_KEY=
METALS_API_KEY=
```

The app still runs without keys by falling back to cached or demo prices.

## Scripts

```bash
npm start              # Start Expo
npm run web            # Start web
npm run android        # Start Android
npm run ios            # Start iOS
npm run typecheck      # TypeScript checks
npm run lint           # ESLint
npm run test           # Jest
npm run test:coverage  # Jest coverage
```

## Data Model

Assets remain backward-compatible:

```ts
interface Asset {
  id: string;
  type: 'USD' | 'SYP' | 'GOLD' | 'SILVER';
  amount: number;
  createdAt: number;
  note?: string;
}
```

v3 adds local goals and snapshots without changing existing asset/history/settings storage:

```ts
interface SavingsGoal {
  id: string;
  title: string;
  targetUsd: number;
  assetTypes: AssetType[] | 'ALL';
  dueDate?: number;
  createdAt: number;
  completedAt?: number;
  note?: string;
}

interface PortfolioSnapshot {
  id: string;
  capturedAt: number;
  totalUsd: number;
  prices: PriceData;
}
```

Full JSON backups use schema version 2 and include assets, transactions, goals, snapshots, settings, export date, and app version. Version 1 imports remain accepted; missing goals and snapshots are treated as empty arrays.

## Verification

Before shipping a change, run:

```bash
npm run typecheck
npm run lint
npm run test -- --runInBand
npx expo install --check
```

Also smoke-test the web app in light and dark theme across Dashboard, Assets, History, Goals, and Settings.
