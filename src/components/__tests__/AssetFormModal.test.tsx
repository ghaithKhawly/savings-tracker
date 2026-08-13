import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AssetFormModal from '../AssetFormModal';
import { Asset } from '../../store/useAssetsStore';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SettingsProvider } from '../../contexts/SettingsContext';

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

const defaultProps = {
  visible: true,
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
};

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

describe('AssetFormModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Add Mode', () => {
    it('should render in add mode when no asset provided', () => {
      const { toJSON } = renderWithProviders(<AssetFormModal {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all asset type buttons', () => {
      const { getByLabelText } = renderWithProviders(<AssetFormModal {...defaultProps} />);
      
      expect(getByLabelText('Select USD')).toBeTruthy();
      expect(getByLabelText('Select SYP')).toBeTruthy();
      expect(getByLabelText('Select GOLD')).toBeTruthy();
      expect(getByLabelText('Select SILVER')).toBeTruthy();
    });

    it('should handle pressing asset type buttons', () => {
      const { getByLabelText } = renderWithProviders(<AssetFormModal {...defaultProps} />);
      
      fireEvent.press(getByLabelText('Select GOLD'));
      expect(getByLabelText('Weight (grams)')).toBeTruthy();
    });

    it('should offer gold coin presets', () => {
      const { getByLabelText } = renderWithProviders(<AssetFormModal {...defaultProps} />);

      fireEvent.press(getByLabelText('Select GOLD'));
      fireEvent.press(getByLabelText('Use Full coin preset, 7 grams'));

      expect(getByLabelText('Weight (grams)').props.value).toBe('7');
    });

    it('should call onCancel when cancel button pressed', () => {
      const { getByLabelText } = renderWithProviders(<AssetFormModal {...defaultProps} />);
      
      fireEvent.press(getByLabelText('Cancel asset form'));
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button pressed', () => {
      const { getByLabelText } = renderWithProviders(<AssetFormModal {...defaultProps} />);
      
      fireEvent.press(getByLabelText('Close asset form'));
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should sanitize non-numeric amount input', () => {
      const { getByLabelText } = renderWithProviders(<AssetFormModal {...defaultProps} />);

      fireEvent.changeText(getByLabelText('Amount (USD)'), '12abc.3.4');

      expect(getByLabelText('Amount (USD)').props.value).toBe('12.34');
    });
  });

  describe('Edit Mode', () => {
    const existingAsset: Asset = {
      id: 'asset-1',
      type: 'GOLD',
      amount: 10,
      createdAt: Date.now(),
      note: 'Existing note',
    };

    it('should render in edit mode when asset provided', () => {
      const { toJSON } = renderWithProviders(
        <AssetFormModal {...defaultProps} asset={existingAsset} />
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should render with existing asset data', () => {
      const { getByLabelText } = renderWithProviders(
        <AssetFormModal {...defaultProps} asset={existingAsset} />
      );
      
      expect(getByLabelText('Weight (grams)').props.value).toBe('10');
      expect(getByLabelText('Asset note').props.value).toBe('Existing note');
    });
  });

  describe('Visibility', () => {
    it('should render when visible', () => {
      const { toJSON } = renderWithProviders(
        <AssetFormModal {...defaultProps} visible={true} />
      );
      
      expect(toJSON()).toBeTruthy();
    });

    it('should return null or empty when not visible', () => {
      const { toJSON } = renderWithProviders(
        <AssetFormModal {...defaultProps} visible={false} />
      );
      
      // When not visible, Modal may return null
      // This is expected behavior
      expect(toJSON()).toBeNull();
    });
  });
});
