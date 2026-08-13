import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionHistory from '../TransactionHistory';
import { useTransactionStore, Transaction } from '../../store/useTransactionStore';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Wrapper component to provide context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </SettingsProvider>
);

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: TestWrapper });
};

// Mock transactions
const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'ADD',
    assetType: 'USD',
    amount: 100,
    createdAt: Date.now() - 1000,
  },
  {
    id: 'tx-2',
    type: 'REMOVE',
    assetType: 'GOLD',
    amount: 5,
    createdAt: Date.now() - 60000,
    note: 'Sold some gold',
  },
  {
    id: 'tx-3',
    type: 'UPDATE',
    assetType: 'SYP',
    amount: 50000,
    previousAmount: 40000,
    createdAt: Date.now() - 3600000,
  },
];

describe('TransactionHistory', () => {
  beforeEach(() => {
    // Reset the store
    useTransactionStore.setState({ transactions: [] });
  });

  it('should render without crashing when no transactions', () => {
    const { toJSON } = renderWithProviders(<TransactionHistory />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render without crashing when transactions are available', () => {
    useTransactionStore.setState({ transactions: mockTransactions });
    const { toJSON } = renderWithProviders(<TransactionHistory />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with limit prop', () => {
    useTransactionStore.setState({ transactions: mockTransactions });
    const { toJSON } = renderWithProviders(<TransactionHistory limit={2} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with asset type filter', () => {
    useTransactionStore.setState({ transactions: mockTransactions });
    const { toJSON } = renderWithProviders(<TransactionHistory assetType="USD" />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render with header', () => {
    useTransactionStore.setState({ transactions: mockTransactions });
    const { toJSON } = renderWithProviders(<TransactionHistory showHeader={true} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render without header', () => {
    useTransactionStore.setState({ transactions: mockTransactions });
    const { toJSON } = renderWithProviders(<TransactionHistory showHeader={false} />);
    expect(toJSON()).toBeTruthy();
  });
});
