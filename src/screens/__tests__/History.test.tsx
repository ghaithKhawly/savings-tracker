import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import History from '../History';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { useTransactionStore } from '../../store/useTransactionStore';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}

describe('History screen', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      transactions: [
        {
          id: 'tx-1',
          type: 'UPDATE',
          assetType: 'USD',
          amount: 150,
          previousAmount: 100,
          note: 'raise target',
          createdAt: Date.now(),
        },
      ],
    });
  });

  it('renders full transaction details and filters search results', () => {
    const { getByLabelText, queryByLabelText } = render(<History />, { wrapper: TestWrapper });

    expect(getByLabelText('UPDATE USD: 100.00 to 150.00 USD, raise target')).toBeTruthy();

    fireEvent.changeText(getByLabelText('Search transaction history'), 'gold');
    expect(queryByLabelText('UPDATE USD: 100.00 to 150.00 USD, raise target')).toBeNull();
  });

  it('allows clearing history to be undone before the timer finishes', () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((button) => button.text === 'Clear')?.onPress?.();
    });

    try {
      const { getByLabelText } = render(<History />, { wrapper: TestWrapper });

      fireEvent.press(getByLabelText('Clear transaction history'));
      expect(getByLabelText('Undo clear history')).toBeTruthy();

      fireEvent.press(getByLabelText('Undo clear history'));

      expect(useTransactionStore.getState().transactions).toHaveLength(1);
    } finally {
      alertSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});
