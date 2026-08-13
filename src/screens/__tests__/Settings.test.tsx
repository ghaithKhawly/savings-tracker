import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Settings from '../Settings';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import useAssetsStore from '../../store/useAssetsStore';
import { useTransactionStore } from '../../store/useTransactionStore';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}

describe('Settings screen', () => {
  beforeEach(() => {
    useAssetsStore.setState({ assets: [] });
    useTransactionStore.setState({ transactions: [] });
  });

  it('renders shared row sublabels for settings actions', async () => {
    const { getByLabelText } = render(<Settings />, { wrapper: TestWrapper });

    await waitFor(() =>
      expect(getByLabelText('Default Currency. Controls how portfolio totals are displayed')).toBeTruthy()
    );

    expect(getByLabelText('Import from JSON. Validate and preview counts before overwriting this device')).toBeTruthy();
    expect(getByLabelText('Delete All Data. Permanently remove assets, history, goals, trends, and cached prices')).toBeTruthy();
  });
});
