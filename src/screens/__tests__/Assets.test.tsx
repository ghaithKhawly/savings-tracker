import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Assets from '../Assets';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import useAssetsStore from '../../store/useAssetsStore';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}

function renderAssets() {
  return render(<Assets />, { wrapper: TestWrapper });
}

describe('Assets screen', () => {
  beforeEach(() => {
    useAssetsStore.setState({ assets: [] });
  });

  it('shows a primary add action when the asset list is empty', () => {
    const { getByLabelText } = renderAssets();

    fireEvent.press(getByLabelText('Add asset'));

    expect(getByLabelText('Amount (USD)')).toBeTruthy();
  });

  it('shows a reset action when filters hide all assets', () => {
    useAssetsStore.setState({
      assets: [
        {
          id: 'asset-1',
          type: 'USD',
          amount: 100,
          createdAt: Date.now(),
          note: 'Visible before search',
        },
      ],
    });

    const { getAllByLabelText, getByLabelText, queryByLabelText } = renderAssets();

    fireEvent.changeText(getByLabelText('Search assets'), 'gold');

    expect(getAllByLabelText('Reset filters')).toHaveLength(2);
    fireEvent.press(getAllByLabelText('Reset filters')[0]);

    expect(queryByLabelText('Reset filters')).toBeNull();
    expect(getByLabelText('USD asset: 100.00 USD, note: Visible before search')).toBeTruthy();
  });
});
