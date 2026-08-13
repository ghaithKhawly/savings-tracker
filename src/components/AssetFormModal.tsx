import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAssetsStore, { Asset, AssetType } from '../store/useAssetsStore';
import { useTheme } from '../contexts/ThemeContext';
import { BORDER_RADIUS, SPACING } from '../theme';
import { parseAmountInput, sanitizeAmountInput } from '../utils/format';

export interface AssetFormData {
  type: AssetType;
  amount: number;
  note?: string;
}

interface AssetFormModalProps {
  visible: boolean;
  asset?: Asset;
  onSubmit: (data: AssetFormData) => void;
  onCancel: () => void;
}

const ASSET_TYPES: AssetType[] = ['USD', 'SYP', 'GOLD', 'SILVER'];
const GOLD_PRESETS = [
  { label: 'Quarter coin', grams: '1.75' },
  { label: 'Half coin', grams: '3.5' },
  { label: 'Full coin', grams: '7' },
  { label: 'Double coin', grams: '14' },
  { label: '1 oz coin', grams: '31.103' },
];
const SILVER_PRESETS = [
  { label: '10g', amount: '10' },
  { label: '50g', amount: '50' },
  { label: '100g', amount: '100' },
  { label: '1 kg', amount: '1000' },
];
const CURRENCY_PRESETS: Record<'USD' | 'SYP', string[]> = {
  USD: ['25', '50', '100', '500', '1000'],
  SYP: ['50000', '100000', '250000', '500000', '1000000'],
};

export default function AssetFormModal({
  visible,
  asset,
  onSubmit,
  onCancel,
}: AssetFormModalProps) {
  const [selectedType, setSelectedType] = useState<AssetType>(asset?.type || 'USD');
  const [amount, setAmount] = useState(asset ? asset.amount.toString() : '');
  const [note, setNote] = useState(asset?.note || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { colors } = useTheme();
  const recentNotes = useAssetsStore((state) =>
    Array.from(new Set(state.assets.map((item) => item.note?.trim()).filter(Boolean) as string[])).slice(0, 5)
  );

  useEffect(() => {
    if (visible && asset) {
      setSelectedType(asset.type);
      setAmount(asset.amount.toString());
      setNote(asset.note || '');
      setErrors({});
    } else if (visible) {
      setSelectedType('USD');
      setAmount('');
      setNote('');
      setErrors({});
    }
  }, [visible, asset]);

  const amountLabel = selectedType === 'USD' || selectedType === 'SYP'
    ? `Amount (${selectedType})`
    : 'Weight (grams)';

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const amountNum = parseAmountInput(amount);

    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (Number.isNaN(amountNum)) {
      newErrors.amount = 'Amount must be a valid number';
    } else if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if ((selectedType === 'USD' || selectedType === 'SYP') && amountNum < 0.01) {
      newErrors.amount = 'Currency amounts must be at least 0.01';
    } else if ((selectedType === 'GOLD' || selectedType === 'SILVER') && amountNum < 0.001) {
      newErrors.amount = 'Metal weights must be at least 0.001 grams';
    } else if ((selectedType === 'USD' || selectedType === 'SYP') && amountNum > 1_000_000_000_000) {
      newErrors.amount = 'This currency amount looks too large. Split it into smaller records.';
    } else if ((selectedType === 'GOLD' || selectedType === 'SILVER') && amountNum > 1_000_000) {
      newErrors.amount = 'This metal weight looks too large. Check the grams value.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      type: selectedType,
      amount: parseAmountInput(amount),
      note: note.trim() || undefined,
    });

    setAmount('');
    setNote('');
    setSelectedType('USD');
    setErrors({});
  };

  const handleCancel = () => {
    setAmount('');
    setNote('');
    setSelectedType('USD');
    setErrors({});
    onCancel();
  };

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.content, { backgroundColor: colors.bgPrimary }]}>
            <View style={[styles.header, { borderBottomColor: colors.gray200 }]}>
              <Text style={[styles.title, { color: colors.gray900 }]}>{asset ? 'Edit Asset' : 'Add Asset'}</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Close asset form"
              >
                <Ionicons name="close" size={24} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.gray800 }]}>Asset Type</Text>
                <View style={styles.typeGrid}>
                  {ASSET_TYPES.map((type) => {
                    const selected = selectedType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          { borderColor: colors.gray200 },
                          selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                        ]}
                        onPress={() => setSelectedType(type)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${type}`}
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.typeButtonText, { color: selected ? colors.primary : colors.gray600 }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.gray800 }]}>{amountLabel}</Text>
                <TextInput
                  style={[
                    styles.input,
                    { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary },
                    errors.amount && { borderColor: colors.error, backgroundColor: colors.errorLight },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(value) => setAmount(sanitizeAmountInput(value))}
                  accessibilityLabel={amountLabel}
                />
                {(selectedType === 'USD' || selectedType === 'SYP') && (
                  <View style={styles.presets}>
                    {CURRENCY_PRESETS[selectedType].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.presetChip, { backgroundColor: colors.primaryLight }]}
                        onPress={() => setAmount(preset)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${preset} ${selectedType} preset`}
                      >
                        <Text style={[styles.presetChipText, { color: colors.primary }]}>{preset}</Text>
                        <Text style={[styles.presetChipAmount, { color: colors.gray600 }]}>{selectedType}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {selectedType === 'GOLD' && (
                  <View style={styles.presets}>
                    {GOLD_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.presetChip, { backgroundColor: colors.primaryLight }]}
                        onPress={() => setAmount(preset.grams)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${preset.label} preset, ${preset.grams} grams`}
                      >
                        <Text style={[styles.presetChipText, { color: colors.primary }]}>{preset.label}</Text>
                        <Text style={[styles.presetChipAmount, { color: colors.gray600 }]}>{preset.grams}g</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {selectedType === 'SILVER' && (
                  <View style={styles.presets}>
                    {SILVER_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.presetChip, { backgroundColor: colors.primaryLight }]}
                        onPress={() => setAmount(preset.amount)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${preset.label} silver preset`}
                      >
                        <Text style={[styles.presetChipText, { color: colors.primary }]}>{preset.label}</Text>
                        <Text style={[styles.presetChipAmount, { color: colors.gray600 }]}>{preset.amount}g</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.amount && <Text style={[styles.errorText, { color: colors.error }]}>{errors.amount}</Text>}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.gray800 }]}>Note (optional)</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.noteInput,
                    { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.bgPrimary },
                  ]}
                  placeholder="Add a note..."
                  placeholderTextColor={colors.gray400}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Asset note"
                />
                {recentNotes.length > 0 && (
                  <View style={styles.presets}>
                    {recentNotes.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.noteChip, { backgroundColor: colors.gray100 }]}
                        onPress={() => setNote(preset)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use recent note ${preset}`}
                      >
                        <Text style={[styles.noteChipText, { color: colors.gray700 }]} numberOfLines={1}>{preset}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.gray200 }]}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel asset form"
              >
                <Text style={[styles.cancelButtonText, { color: colors.gray600 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                accessibilityRole="button"
                accessibilityLabel={asset ? 'Update asset' : 'Add asset'}
              >
                <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                  {asset ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return visible ? <View style={styles.webModalRoot}>{content}</View> : null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webModalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    maxHeight: '90%',
    paddingTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    minHeight: 44,
  },
  noteInput: {
    minHeight: 80,
    paddingTop: SPACING.sm,
    textAlignVertical: 'top',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  presetChip: {
    minHeight: 42,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetChipAmount: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  noteChip: {
    maxWidth: 160,
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
  },
  noteChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
