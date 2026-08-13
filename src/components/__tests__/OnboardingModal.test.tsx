import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingModal from '../OnboardingModal';
import { AppSettings, SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

const settings: AppSettings = {
  themeMode: 'light',
  currencyDisplay: 'USD',
  showCents: true,
  onboardingCompleted: false,
  pricePreference: 'live',
  hideBalances: false,
  privacyScreenEnabled: true,
  appLockEnabled: false,
  allocationTargets: {
    USD: 25,
    SYP: 10,
    GOLD: 55,
    SILVER: 10,
  },
};

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}

describe('OnboardingModal', () => {
  it('persists setup choices and starts asset entry', async () => {
    const onComplete = jest.fn(() => Promise.resolve());
    const onAddAsset = jest.fn();

    const { getByLabelText } = render(
      <OnboardingModal
        visible
        settings={settings}
        onComplete={onComplete}
        onAddAsset={onAddAsset}
        onImportBackup={jest.fn()}
      />,
      { wrapper: TestWrapper }
    );

    fireEvent.press(getByLabelText('SYP'));
    fireEvent.press(getByLabelText('Dark'));
    fireEvent.press(getByLabelText('Cached first'));
    fireEvent.press(getByLabelText('Start by adding an asset'));

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        currencyDisplay: 'SYP',
        themeMode: 'dark',
        pricePreference: 'cached',
        onboardingCompleted: true,
      })
    );
    expect(onAddAsset).toHaveBeenCalled();
  });

  it('can skip onboarding without launching an action', async () => {
    const onComplete = jest.fn(() => Promise.resolve());
    const onAddAsset = jest.fn();
    const onImportBackup = jest.fn();

    const { getByLabelText } = render(
      <OnboardingModal
        visible
        settings={settings}
        onComplete={onComplete}
        onAddAsset={onAddAsset}
        onImportBackup={onImportBackup}
      />,
      { wrapper: TestWrapper }
    );

    fireEvent.press(getByLabelText('Skip onboarding'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ onboardingCompleted: true })));
    expect(onAddAsset).not.toHaveBeenCalled();
    expect(onImportBackup).not.toHaveBeenCalled();
  });
});
