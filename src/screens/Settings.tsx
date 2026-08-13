import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import useAssetsStore, { AssetType } from '../store/useAssetsStore';
import { useTransactionStore } from '../store/useTransactionStore';
import useGoalsStore from '../store/useGoalsStore';
import usePortfolioSnapshotsStore from '../store/usePortfolioSnapshotsStore';
import { clearPriceCache } from '../services/priceService';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings, ThemeMode } from '../contexts/SettingsContext';
import { SPACING, BORDER_RADIUS } from '../theme';
import { createExportPayload, getImportPreview, validateImportPayload, ValidatedImportPayload } from '../utils/importExport';
import {
  canUsePassphraseBackups,
  decryptBackupJson,
  encryptBackupJson,
  isEncryptedBackupPayload,
} from '../utils/secureBackup';
import { assetsToCsv, transactionsToCsv } from '../utils/csv';

export default function Settings() {
  const assets = useAssetsStore((state) => state.assets);
  const replaceAssets = useAssetsStore((state) => state.replaceAssets);
  const clearAssets = useAssetsStore((state) => state.clearAssets);
  const transactions = useTransactionStore((state) => state.transactions);
  const replaceTransactions = useTransactionStore((state) => state.replaceTransactions);
  const clearTransactions = useTransactionStore((state) => state.clearTransactions);
  const goals = useGoalsStore((state) => state.goals);
  const replaceGoals = useGoalsStore((state) => state.replaceGoals);
  const clearGoals = useGoalsStore((state) => state.clearGoals);
  const snapshots = usePortfolioSnapshotsStore((state) => state.snapshots);
  const replaceSnapshots = usePortfolioSnapshotsStore((state) => state.replaceSnapshots);
  const clearSnapshots = usePortfolioSnapshotsStore((state) => state.clearSnapshots);
  
  const { colors, isDarkMode } = useTheme();
  const { settings, updateSettings, isLoading } = useSettings();
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [pendingImport, setPendingImport] = useState<ValidatedImportPayload | null>(null);

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || 
                      Constants.expoConfig?.android?.versionCode?.toString() || '1';

  const exportTextFile = async (filename: string, content: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const uri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
  };

  const handleExportData = async () => {
    if (assets.length === 0 && transactions.length === 0 && goals.length === 0) {
      Alert.alert('No Data', 'No data to export. Add some assets first.');
      return;
    }

    const exportData = createExportPayload(assets, transactions, goals, snapshots, settings, appVersion);

    const jsonString = JSON.stringify(exportData, null, 2);

    try {
      await exportTextFile('savings-tracker-backup.json', jsonString, 'application/json');
    } catch {
      Alert.alert('Export Failed', 'Unable to create the export file.');
    }
  };

  const handleExportProtectedData = async () => {
    if (!canUsePassphraseBackups()) {
      Alert.alert(
        'Protected Export Unavailable',
        'This runtime does not expose Web Crypto AES-GCM. Use normal JSON export here, or export from a supported web runtime.'
      );
      return;
    }
    if (backupPassphrase.trim().length < 8) {
      Alert.alert('Passphrase Needed', 'Enter a backup passphrase with at least 8 characters first.');
      return;
    }
    if (assets.length === 0 && transactions.length === 0 && goals.length === 0) {
      Alert.alert('No Data', 'No data to export. Add some assets first.');
      return;
    }

    try {
      const exportData = createExportPayload(assets, transactions, goals, snapshots, settings, appVersion);
      const protectedJson = await encryptBackupJson(JSON.stringify(exportData), backupPassphrase);
      await exportTextFile('savings-tracker-backup.encrypted.json', protectedJson, 'application/json');
    } catch (error) {
      Alert.alert('Protected Export Failed', error instanceof Error ? error.message : 'Unable to encrypt backup.');
    }
  };

  const handleImportData = async () => {
    let rawJson = '';

    try {
      if (Platform.OS === 'web') {
        rawJson = await pickWebJsonFile();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/json', 'text/plain'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        rawJson = await FileSystem.readAsStringAsync(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Unable to read import file.');
      return;
    }

    let importData: ValidatedImportPayload;
    try {
      const parsed = JSON.parse(rawJson);
      const importJson = isEncryptedBackupPayload(parsed)
        ? await decryptBackupJson(parsed, backupPassphrase)
        : rawJson;
      importData = validateImportPayload(JSON.parse(importJson));
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Malformed import file.');
      return;
    }

    setPendingImport(importData);
  };

  const confirmImportData = async () => {
    if (!pendingImport) return;
    replaceAssets(pendingImport.assets);
    replaceTransactions(pendingImport.transactions);
    replaceGoals(pendingImport.goals);
    replaceSnapshots(pendingImport.snapshots);
    if (pendingImport.settings) {
      await updateSettings(pendingImport.settings);
    }
    setPendingImport(null);
    Alert.alert('Success', 'Data imported successfully.');
  };

  const pickWebJsonFile = () => {
    return new Promise<string>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json,text/plain';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read selected file.'));
        reader.readAsText(file);
      };
      input.click();
    });
  };

  const handleExportAssetsCsv = async () => {
    if (assets.length === 0) {
      Alert.alert('No Assets', 'There are no assets to export.');
      return;
    }

    try {
      await exportTextFile('savings-tracker-assets.csv', assetsToCsv(assets), 'text/csv');
    } catch {
      Alert.alert('Export Failed', 'Unable to create the assets CSV file.');
    }
  };

  const handleExportTransactionsCsv = async () => {
    if (transactions.length === 0) {
      Alert.alert('No History', 'There is no transaction history to export.');
      return;
    }

    try {
      await exportTextFile('savings-tracker-transactions.csv', transactionsToCsv(transactions), 'text/csv');
    } catch {
      Alert.alert('Export Failed', 'Unable to create the transaction CSV file.');
    }
  };

  const handleClearData = () => {
    if (assets.length === 0 && transactions.length === 0) {
      Alert.alert('No Data', 'There is no data to clear.');
      return;
    }

    const totalItems = assets.length + transactions.length + goals.length + snapshots.length;
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${totalItems} item(s) including assets and transaction history. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            clearAssets();
            clearTransactions();
            clearGoals();
            clearSnapshots();
            clearPriceCache();
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Price Cache',
      'This removes saved exchange and metal prices. Fresh prices will be fetched next time the dashboard refreshes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearPriceCache();
            Alert.alert('Success', 'Price cache has been cleared. Fresh prices will be fetched.');
          },
        },
      ]
    );
  };

  const handleToggleDarkMode = async () => {
    const newMode: ThemeMode = isDarkMode ? 'light' : 'dark';
    await updateSettings({ themeMode: newMode });
  };

  const handleToggleCurrency = async () => {
    const newCurrency = settings.currencyDisplay === 'USD' ? 'SYP' : 'USD';
    await updateSettings({ currencyDisplay: newCurrency });
  };

  const handleToggleShowCents = async () => {
    await updateSettings({ showCents: !settings.showCents });
  };

  const handleToggleHideBalances = async () => {
    await updateSettings({ hideBalances: !settings.hideBalances });
  };

  const handleTogglePrivacyScreen = async () => {
    await updateSettings({ privacyScreenEnabled: !settings.privacyScreenEnabled });
  };

  const handleToggleAppLock = async () => {
    await updateSettings({ appLockEnabled: !settings.appLockEnabled });
  };

  const handlePricePreferenceChange = async () => {
    const modes = ['live', 'cached', 'demo'] as const;
    const currentIndex = modes.indexOf(settings.pricePreference);
    await updateSettings({ pricePreference: modes[(currentIndex + 1) % modes.length] });
  };

  const handleBumpAllocationTarget = async (type: AssetType) => {
    const current = settings.allocationTargets[type] ?? 0;
    await updateSettings({
      allocationTargets: {
        ...settings.allocationTargets,
        [type]: current >= 100 ? 0 : current + 5,
      },
    });
  };

  const handleThemeModeChange = async () => {
    // Cycle through: light -> dark -> system -> light
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(settings.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    await updateSettings({ themeMode: modes[nextIndex] });
  };

  const getThemeModeLabel = (): string => {
    switch (settings.themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'Light';
    }
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
        {children}
      </View>
    </View>
  );

  const renderRow = (
    label: string,
    sublabel: string | undefined,
    rightContent: React.ReactNode,
    onPress?: () => void,
    isLast: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.row,
        { borderBottomColor: colors.gray100 },
        isLast && styles.rowLast
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
    >
      <View style={styles.rowTextBlock}>
        <Text style={[styles.rowLabel, { color: colors.gray800 }]}>{label}</Text>
        {sublabel && <Text style={[styles.rowSublabel, { color: colors.gray500 }]}>{sublabel}</Text>}
      </View>
      {rightContent}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        {renderSection(
          'Appearance',
          <>
            {renderRow(
              'Dark Mode',
              'Use the dark color theme immediately',
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor={colors.white}
                accessibilityLabel="Toggle dark mode"
              />
            )}
            {renderRow(
              'Theme Mode',
              'Choose light, dark, or follow the system setting',
              <TouchableOpacity
                style={[styles.themeToggle, { backgroundColor: colors.primaryLight }]}
                onPress={handleThemeModeChange}
                accessibilityLabel={`Theme mode: ${getThemeModeLabel()}`}
                accessibilityHint="Tap to cycle through light, dark, and system themes"
              >
                <Text style={[styles.themeText, { color: colors.primary }]}>{getThemeModeLabel()}</Text>
              </TouchableOpacity>,
              handleThemeModeChange,
              true
            )}
          </>
        )}

        {/* Display */}
        {renderSection(
          'Display',
          <>
            {renderRow(
              'Default Currency',
              'Controls how portfolio totals are displayed',
              <TouchableOpacity
                style={[styles.currencyToggle, { backgroundColor: colors.primaryLight }]}
                onPress={handleToggleCurrency}
                accessibilityLabel={`Currency display: ${settings.currencyDisplay}`}
                accessibilityHint="Double tap to toggle currency"
              >
                <Text style={[styles.currencyText, { color: colors.primary }]}>{settings.currencyDisplay}</Text>
              </TouchableOpacity>,
              handleToggleCurrency
            )}
            {renderRow(
              'Show Decimals',
              'Show cents for USD and SYP values',
              <Switch
                value={settings.showCents}
                onValueChange={handleToggleShowCents}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor={colors.white}
                accessibilityLabel="Toggle show cents"
              />,
              undefined,
              true
            )}
          </>
        )}

        {/* Data Management */}
        {renderSection(
          'Data',
          <>
            <View style={[styles.passphraseBlock, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.rowLabel, { color: colors.gray800 }]}>Backup Passphrase</Text>
              <Text style={[styles.rowSublabel, { color: colors.gray500 }]}>
                Used only for protected backup export/import. It is not stored.
              </Text>
              <TextInput
                style={[styles.passphraseInput, { borderColor: colors.gray200, color: colors.gray900 }]}
                value={backupPassphrase}
                onChangeText={setBackupPassphrase}
                placeholder="8+ characters"
                placeholderTextColor={colors.gray400}
                secureTextEntry
                accessibilityLabel="Backup passphrase"
              />
            </View>
            {renderRow(
              'Export Full Backup (JSON)',
              'Save assets, history, goals, trends, settings, app version, and export date',
              <Text style={[styles.rowAction, { color: colors.primary }]}>Export</Text>,
              handleExportData
            )}
            {renderRow(
              'Export Protected Backup',
              canUsePassphraseBackups()
                ? 'Encrypt JSON with the passphrase above using AES-GCM'
                : 'Unavailable on this runtime; normal storage is not encrypted',
              <Text style={[styles.rowAction, { color: canUsePassphraseBackups() ? colors.primary : colors.gray400 }]}>Protect</Text>,
              handleExportProtectedData
            )}
            {renderRow(
              'Import from JSON',
              'Validate and preview counts before overwriting this device',
              <Text style={[styles.rowAction, { color: colors.primary }]}>Import</Text>,
              handleImportData
            )}
            {renderRow(
              'Export Assets CSV',
              'Create a spreadsheet-friendly asset file',
              <Text style={[styles.rowAction, { color: colors.primary }]}>CSV</Text>,
              handleExportAssetsCsv
            )}
            {renderRow(
              'Export History CSV',
              'Create a spreadsheet-friendly transaction file',
              <Text style={[styles.rowAction, { color: colors.primary }]}>CSV</Text>,
              handleExportTransactionsCsv
            )}
            {renderRow(
              'Clear Price Cache',
              'Remove saved rates; assets and history stay unchanged',
              <Text style={[styles.rowAction, { color: colors.primary }]}>Clear</Text>,
              handleClearCache
            )}
            {renderRow(
              'Delete All Data',
              'Permanently remove assets, history, goals, trends, and cached prices',
              <Text style={[styles.rowAction, { color: colors.error }]}>Delete</Text>,
              handleClearData,
              true
            )}
          </>
        )}

        {/* Security */}
        {renderSection(
          'Security & Privacy',
          <>
            {renderRow(
              'Hide Balances',
              'Mask portfolio values while keeping navigation usable',
              <Switch
                value={settings.hideBalances}
                onValueChange={handleToggleHideBalances}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor={colors.white}
                accessibilityLabel="Toggle hide balances"
              />
            )}
            {renderRow(
              'Privacy Screen',
              'Cover the app when it backgrounds or becomes inactive',
              <Switch
                value={settings.privacyScreenEnabled}
                onValueChange={handleTogglePrivacyScreen}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor={colors.white}
                accessibilityLabel="Toggle privacy screen"
              />
            )}
            {renderRow(
              'App Lock',
              'Preference saved for supported native builds; no lock provider is bundled yet',
              <Switch
                value={settings.appLockEnabled}
                onValueChange={handleToggleAppLock}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor={colors.white}
                accessibilityLabel="Toggle app lock preference"
              />
            )}
            {renderRow(
              'Price Preference',
              'Choose live first, cached first, or demo-first setup guidance',
              <TouchableOpacity
                style={[styles.themeToggle, { backgroundColor: colors.primaryLight }]}
                onPress={handlePricePreferenceChange}
                accessibilityLabel={`Price preference: ${settings.pricePreference}`}
              >
                <Text style={[styles.themeText, { color: colors.primary }]}>{settings.pricePreference}</Text>
              </TouchableOpacity>,
              handlePricePreferenceChange,
              true
            )}
          </>
        )}

        {/* Statistics */}
        {renderSection(
          'Allocation Targets',
          <>
            {(['USD', 'SYP', 'GOLD', 'SILVER'] as AssetType[]).map((type, index, items) => (
              <React.Fragment key={type}>
                {renderRow(
                  type,
                  'Tap to adjust target share in 5 percent steps',
                  <Text style={[styles.rowValue, { color: colors.gray500 }]}>{settings.allocationTargets[type]}%</Text>,
                  () => handleBumpAllocationTarget(type),
                  index === items.length - 1
                )}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Statistics */}
        {renderSection(
          'Statistics',
          <>
            {renderRow('Total Assets', 'Number of saved asset entries', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{assets.length}</Text>)}
            {renderRow('Transaction History', 'Logged ADD, REMOVE, and UPDATE records', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{transactions.length}</Text>)}
            {renderRow('Savings Goals', 'Local progress targets', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{goals.length}</Text>)}
            {renderRow('Trend Snapshots', 'Portfolio value records', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{snapshots.length}</Text>, undefined, true)}
          </>
        )}

        {/* About */}
        {renderSection(
          'About',
          <>
            {renderRow('Version', 'Installed app version', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{appVersion}</Text>)}
            {renderRow('Build', 'Native build identifier', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{buildNumber}</Text>)}
            {renderRow('Platform', 'Current runtime platform', <Text style={[styles.rowValue, { color: colors.gray500 }]}>{Platform.OS}</Text>, undefined, true)}
          </>
        )}

        {/* Credits */}
        <View style={styles.credits}>
          <Text style={[styles.creditsText, { color: colors.gray600 }]}>Savings Tracker</Text>
          <Text style={[styles.creditsSubtext, { color: colors.gray400 }]}>
            Local-first storage. AsyncStorage/localStorage are convenient storage, not encrypted vaults.
          </Text>
        </View>
      </ScrollView>
      <ImportPreviewModal
        payload={pendingImport}
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImportData}
      />
    </SafeAreaView>
  );

  function ImportPreviewModal({
    payload,
    onCancel,
    onConfirm,
  }: {
    payload: ValidatedImportPayload | null;
    onCancel: () => void;
    onConfirm: () => void;
  }) {
    if (!payload) return null;
    const preview = getImportPreview(payload);
    const content = (
      <View style={styles.importOverlay}>
        <View style={[styles.importCard, { backgroundColor: colors.bgPrimary }]}>
          <Text style={[styles.importTitle, { color: colors.gray900 }]}>Preview Import</Text>
          <Text style={[styles.importText, { color: colors.gray600 }]}>
            Import will overwrite local assets, history, goals, snapshots, and matching settings only after you confirm.
          </Text>
          {[
            ['Assets', preview.assets],
            ['Transactions', preview.transactions],
            ['Goals', preview.goals],
            ['Snapshots', preview.snapshots],
            ['Settings', preview.hasSettings ? 'Included' : 'Not included'],
          ].map(([label, value]) => (
            <View key={label} style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.gray500 }]}>{label}</Text>
              <Text style={[styles.previewValue, { color: colors.gray900 }]}>{value}</Text>
            </View>
          ))}
          <View style={styles.importActions}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.gray200 }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.gray600 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.importButton, { backgroundColor: colors.error }]} onPress={onConfirm}>
              <Text style={[styles.importButtonText, { color: colors.onPrimary }]}>Overwrite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    if (Platform.OS === 'web') {
      return <View style={styles.webImportRoot}>{content}</View>;
    }

    return (
      <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
        {content}
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['2xl'],
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginStart: SPACING.xs,
  },
  sectionContent: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowTextBlock: {
    flex: 1,
    paddingEnd: SPACING.md,
  },
  rowSublabel: {
    fontSize: 12,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 16,
  },
  rowAction: {
    fontSize: 16,
    fontWeight: '500',
  },
  passphraseBlock: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  passphraseInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    fontSize: 15,
  },
  currencyToggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeToggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  credits: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  creditsSubtext: {
    fontSize: 13,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  webImportRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  importOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  importCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  importTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  importText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  importActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  importButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
