import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Dashboard from '../Dashboard';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import useAssetsStore from '../../store/useAssetsStore';
import useGoalsStore from '../../store/useGoalsStore';
import usePortfolioSnapshotsStore from '../../store/usePortfolioSnapshotsStore';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../services/priceService', () => ({
  getLivePrices: jest.fn(() =>
    Promise.resolve({
      data: {
        usdToSyp: 100,
        goldPerGram: 50,
        silverPerGram: 1,
        lastUpdated: Date.now(),
      },
    })
  ),
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}

describe('Dashboard screen', () => {
  beforeEach(() => {
    useAssetsStore.setState({ assets: [] });
    useGoalsStore.setState({ goals: [] });
    usePortfolioSnapshotsStore.setState({ snapshots: [] });
  });

  it('keeps dashboard sections visible when there are no assets', async () => {
    const { getByLabelText } = render(<Dashboard />, { wrapper: TestWrapper });

    await waitFor(() => expect(getByLabelText('Quick add asset')).toBeTruthy());

    expect(getByLabelText('Goals section')).toBeTruthy();
    expect(getByLabelText('Portfolio trend section')).toBeTruthy();
    expect(getByLabelText('Asset distribution chart')).toBeTruthy();
    expect(getByLabelText('Current exchange rates')).toBeTruthy();
  });

  it('opens quick add from the dashboard', async () => {
    const { getByLabelText } = render(<Dashboard />, { wrapper: TestWrapper });

    await waitFor(() => expect(getByLabelText('Quick add asset')).toBeTruthy());
    fireEvent.press(getByLabelText('Quick add asset'));

    expect(getByLabelText('Amount (USD)')).toBeTruthy();
  });
});
