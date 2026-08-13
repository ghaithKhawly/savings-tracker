import { Asset } from '../../store/useAssetsStore';
import { Transaction } from '../../store/useTransactionStore';
import { assetsToCsv, transactionsToCsv } from '../csv';

describe('csv utilities', () => {
  it('exports assets with escaped notes', () => {
    const assets: Asset[] = [
      { id: 'a1', type: 'USD', amount: 10, note: 'cash, wallet', createdAt: Date.UTC(2026, 0, 1) },
    ];

    expect(assetsToCsv(assets)).toContain('"cash, wallet"');
  });

  it('exports update transactions with previous amount', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'UPDATE',
        assetType: 'GOLD',
        amount: 2,
        previousAmount: 1,
        createdAt: Date.UTC(2026, 0, 2),
      },
    ];

    expect(transactionsToCsv(transactions)).toContain('UPDATE,GOLD,2,1');
  });
});
