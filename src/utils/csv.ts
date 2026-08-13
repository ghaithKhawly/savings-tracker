import { Asset } from '../store/useAssetsStore';
import { Transaction } from '../store/useTransactionStore';

function escapeCell(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}

export function assetsToCsv(assets: Asset[]): string {
  return rowsToCsv([
    ['id', 'type', 'amount', 'note', 'createdAt'],
    ...assets.map((asset) => [
      asset.id,
      asset.type,
      asset.amount,
      asset.note || '',
      new Date(asset.createdAt).toISOString(),
    ]),
  ]);
}

export function transactionsToCsv(transactions: Transaction[]): string {
  return rowsToCsv([
    ['id', 'type', 'assetType', 'amount', 'previousAmount', 'note', 'assetId', 'createdAt'],
    ...transactions.map((transaction) => [
      transaction.id,
      transaction.type,
      transaction.assetType,
      transaction.amount,
      transaction.previousAmount ?? '',
      transaction.note || '',
      transaction.assetId || '',
      new Date(transaction.createdAt).toISOString(),
    ]),
  ]);
}
