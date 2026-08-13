import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Goals from '../Goals';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import useAssetsStore from '../../store/useAssetsStore';
import useGoalsStore from '../../store/useGoalsStore';

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

describe('Goals screen', () => {
  beforeEach(() => {
    useAssetsStore.setState({
      assets: [{ id: 'asset-1', type: 'USD', amount: 50, createdAt: Date.now() }],
    });
    useGoalsStore.setState({ goals: [] });
  });

  it('opens goal creation from the empty state', () => {
    const { getByLabelText } = render(<Goals />, { wrapper: TestWrapper });

    fireEvent.press(getByLabelText('Create first savings goal'));

    expect(getByLabelText('Goal title')).toBeTruthy();
  });

  it('shows calculated progress for existing goals', async () => {
    useGoalsStore.setState({
      goals: [
        {
          id: 'goal-1',
          title: 'Emergency',
          targetUsd: 100,
          assetTypes: 'ALL',
          createdAt: Date.now(),
        },
      ],
    });

    const { getByLabelText } = render(<Goals />, { wrapper: TestWrapper });

    await waitFor(() => expect(getByLabelText('Edit Emergency')).toBeTruthy());
    expect(getByLabelText('Emergency: 50 percent complete, $50.00 remaining')).toBeTruthy();
  });
});
