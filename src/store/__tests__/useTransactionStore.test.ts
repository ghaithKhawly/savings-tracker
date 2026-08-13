import { useTransactionStore, logAssetTransaction } from '../useTransactionStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('useTransactionStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTransactionStore.setState({ transactions: [] });
  });

  describe('addTransaction', () => {
    it('should add a new transaction', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({
        type: 'ADD',
        assetType: 'USD',
        amount: 100,
      });

      const state = useTransactionStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].type).toBe('ADD');
      expect(state.transactions[0].assetType).toBe('USD');
      expect(state.transactions[0].amount).toBe(100);
    });

    it('should generate unique ids for transactions', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 100 });
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 200 });

      const state = useTransactionStore.getState();
      expect(state.transactions[0].id).not.toBe(state.transactions[1].id);
    });

    it('should add createdAt timestamp', () => {
      const before = Date.now();
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({ type: 'ADD', assetType: 'GOLD', amount: 5 });

      const state = useTransactionStore.getState();
      const after = Date.now();
      
      expect(state.transactions[0].createdAt).toBeGreaterThanOrEqual(before);
      expect(state.transactions[0].createdAt).toBeLessThanOrEqual(after);
    });

    it('should store optional fields', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({
        type: 'UPDATE',
        assetType: 'SYP',
        amount: 50000,
        previousAmount: 40000,
        note: 'Updated amount',
        assetId: 'asset-123',
      });

      const state = useTransactionStore.getState();
      expect(state.transactions[0].previousAmount).toBe(40000);
      expect(state.transactions[0].note).toBe('Updated amount');
      expect(state.transactions[0].assetId).toBe('asset-123');
    });

    it('should add transactions at the beginning of the list', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 100 });
      addTransaction({ type: 'ADD', assetType: 'GOLD', amount: 5 });

      const state = useTransactionStore.getState();
      expect(state.transactions[0].assetType).toBe('GOLD'); // Most recent first
      expect(state.transactions[1].assetType).toBe('USD');
    });

    it('should limit transactions to 500', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      // Add 510 transactions
      for (let i = 0; i < 510; i++) {
        addTransaction({ type: 'ADD', assetType: 'USD', amount: i });
      }

      const state = useTransactionStore.getState();
      expect(state.transactions.length).toBe(500);
    });
  });

  describe('clearTransactions', () => {
    it('should clear all transactions', () => {
      const { addTransaction, clearTransactions } = useTransactionStore.getState();
      
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 100 });
      addTransaction({ type: 'ADD', assetType: 'GOLD', amount: 5 });

      clearTransactions();

      const state = useTransactionStore.getState();
      expect(state.transactions).toHaveLength(0);
    });
  });

  describe('getTransactionsByAssetType', () => {
    it('should filter transactions by asset type', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 100 });
      addTransaction({ type: 'ADD', assetType: 'GOLD', amount: 5 });
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 200 });

      const usdTransactions = useTransactionStore.getState().getTransactionsByAssetType('USD');
      
      expect(usdTransactions).toHaveLength(2);
      expect(usdTransactions.every((tx) => tx.assetType === 'USD')).toBe(true);
    });

    it('should return empty array when no matching transactions', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      addTransaction({ type: 'ADD', assetType: 'USD', amount: 100 });

      const silverTransactions = useTransactionStore.getState().getTransactionsByAssetType('SILVER');
      
      expect(silverTransactions).toHaveLength(0);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return limited number of transactions', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      for (let i = 0; i < 30; i++) {
        addTransaction({ type: 'ADD', assetType: 'USD', amount: i });
      }

      const recent = useTransactionStore.getState().getRecentTransactions(10);
      
      expect(recent).toHaveLength(10);
    });

    it('should default to 20 transactions', () => {
      const { addTransaction } = useTransactionStore.getState();
      
      for (let i = 0; i < 30; i++) {
        addTransaction({ type: 'ADD', assetType: 'USD', amount: i });
      }

      const recent = useTransactionStore.getState().getRecentTransactions();
      
      expect(recent).toHaveLength(20);
    });
  });
});

describe('logAssetTransaction', () => {
  beforeEach(() => {
    useTransactionStore.setState({ transactions: [] });
  });

  it('should log ADD transaction', () => {
    logAssetTransaction('ADD', 'USD', 100, { note: 'Test' });

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].type).toBe('ADD');
  });

  it('should log REMOVE transaction', () => {
    logAssetTransaction('REMOVE', 'GOLD', 5, { assetId: 'asset-1' });

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].type).toBe('REMOVE');
    expect(state.transactions[0].assetId).toBe('asset-1');
  });

  it('should log UPDATE transaction with previous amount', () => {
    logAssetTransaction('UPDATE', 'SYP', 50000, { previousAmount: 40000 });

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].type).toBe('UPDATE');
    expect(state.transactions[0].previousAmount).toBe(40000);
  });
});
