import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { AppSettings, CurrencyDisplay, PricePreference, ThemeMode } from '../contexts/SettingsContext';
import { BORDER_RADIUS, SPACING } from '../theme';

interface OnboardingModalProps {
  visible: boolean;
  settings: AppSettings;
  onComplete: (updates: Partial<AppSettings>) => Promise<void>;
  onAddAsset: () => void;
  onImportBackup: () => void;
}

const CURRENCIES: CurrencyDisplay[] = ['USD', 'SYP'];
const THEMES: ThemeMode[] = ['light', 'dark', 'system'];
const PRICE_PREFERENCES: PricePreference[] = ['live', 'cached', 'demo'];

export default function OnboardingModal({
  visible,
  settings,
  onComplete,
  onAddAsset,
  onImportBackup,
}: OnboardingModalProps) {
  const { colors } = useTheme();
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>(settings.currencyDisplay);
  const [themeMode, setThemeMode] = useState<ThemeMode>(settings.themeMode);
  const [pricePreference, setPricePreference] = useState<PricePreference>(settings.pricePreference);
  const [saving, setSaving] = useState(false);

  function OptionGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.optionGroup}>
        <Text style={[styles.optionTitle, { color: colors.gray800 }]}>{title}</Text>
        <View style={styles.optionRow}>{children}</View>
      </View>
    );
  }

  function OptionChip({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        style={[styles.optionChip, { backgroundColor: selected ? colors.primary : colors.gray200 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
      >
        <Text style={[styles.optionChipText, { color: selected ? colors.onPrimary : colors.gray700 }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  const complete = async (nextAction?: 'add' | 'import') => {
    setSaving(true);
    await onComplete({
      currencyDisplay,
      themeMode,
      pricePreference,
      onboardingCompleted: true,
    });
    setSaving(false);

    if (nextAction === 'add') onAddAsset();
    if (nextAction === 'import') onImportBackup();
  };

  const content = (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.panel, { backgroundColor: colors.bgPrimary }]}>
          <View style={styles.header}>
            <View style={[styles.iconBubble, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.gray900 }]}>Set up Savings Tracker</Text>
              <Text style={[styles.subtitle, { color: colors.gray500 }]}>
                Track local assets, metals, history, goals, and backups on this device.
              </Text>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <OptionGroup title="Display currency">
              {CURRENCIES.map((item) => (
                <OptionChip
                  key={item}
                  label={item}
                  selected={currencyDisplay === item}
                  onPress={() => setCurrencyDisplay(item)}
                />
              ))}
            </OptionGroup>

            <OptionGroup title="Theme">
              {THEMES.map((item) => (
                <OptionChip
                  key={item}
                  label={item === 'system' ? 'System' : item === 'dark' ? 'Dark' : 'Light'}
                  selected={themeMode === item}
                  onPress={() => setThemeMode(item)}
                />
              ))}
            </OptionGroup>

            <OptionGroup title="Price preference">
              {PRICE_PREFERENCES.map((item) => (
                <OptionChip
                  key={item}
                  label={item === 'live' ? 'Live first' : item === 'cached' ? 'Cached first' : 'Demo mode'}
                  selected={pricePreference === item}
                  onPress={() => setPricePreference(item)}
                />
              ))}
            </OptionGroup>

            <View style={[styles.note, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.warning} />
              <Text style={[styles.noteText, { color: colors.gray700 }]}>
                Data stays local. Device storage is not claimed to be encrypted; use protected exports for sharing.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.gray200 }]}
              onPress={() => complete()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
            >
              <Text style={[styles.secondaryText, { color: colors.gray700 }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.gray200 }]}
              onPress={() => complete('import')}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Import a backup"
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>Import</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => complete('add')}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Start by adding an asset"
            >
              <Ionicons name="add" size={16} color={colors.onPrimary} />
              <Text style={[styles.primaryText, { color: colors.onPrimary }]}>Add Asset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return visible ? <View style={styles.webRoot}>{content}</View> : null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webRoot: { ...StyleSheet.absoluteFillObject, zIndex: 2000 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    maxHeight: '92%',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: SPACING.xs },
  body: { paddingHorizontal: SPACING.lg },
  optionGroup: { marginTop: SPACING.lg },
  optionTitle: { fontSize: 14, fontWeight: '800', marginBottom: SPACING.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  optionChip: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipText: { fontSize: 13, fontWeight: '800' },
  note: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  secondaryText: { fontSize: 14, fontWeight: '800' },
  primaryText: { fontSize: 14, fontWeight: '800' },
});
