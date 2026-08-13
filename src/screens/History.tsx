import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore, Transaction, TransactionType } from '../store/useTransactionStore';
import { AssetType } from '../store/useAssetsStore';
import { useTheme } from '../contexts/ThemeContext';
import { BORDER_RADIUS, SPACING } from '../theme';
import { formatAssetAmount, formatRelativeDate } from '../utils/format';
import { transactionsToCsv } from '../utils/csv';

type TypeFilter = 'ALL' | TransactionType;
type AssetFilter = 'ALL' | AssetType;
type DateFilter = 'ALL' | '7D' | '30D';

const TYPE_FILTERS: TypeFilter[] = ['ALL', 'ADD', 'REMOVE', 'UPDATE'];
const ASSET_FILTERS: AssetFilter[] = ['ALL', 'USD', 'SYP', 'GOLD', 'SILVER'];
const DATE_FILTERS: DateFilter[] = ['ALL', '7D', '30D'];

export default function History() {
  const transactions = useTransactionStore((state) => state.transactions);
  const clearTransactions = useTransactionStore((state) => state.clearTransactions);
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [pendingClearCount, setPendingClearCount] = useState(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minDate =
      dateFilter === '7D'
        ? Date.now() - 7 * 24 * 60 * 60 * 1000
        : dateFilter === '30D'
          ? Date.now() - 30 * 24 * 60 * 60 * 1000
          : 0;

    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (assetFilter !== 'ALL' && tx.assetType !== assetFilter) return false;
      if (minDate && tx.createdAt < minDate) return false;
      if (!normalizedQuery) return true;

      return (
        tx.type.toLowerCase().includes(normalizedQuery) ||
        tx.assetType.toLowerCase().includes(normalizedQuery) ||
        tx.amount.toString().includes(normalizedQuery) ||
        tx.previousAmount?.toString().includes(normalizedQuery) ||
        tx.note?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [assetFilter, dateFilter, query, transactions, typeFilter]);

  const resetFilters = () => {
    setQuery('');
    setTypeFilter('ALL');
    setAssetFilter('ALL');
    setDateFilter('ALL');
  };

  const exportText = async (content: string, filename: string, mimeType: string) => {
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

  const handleExportJson = async () => {
    await exportText(
      JSON.stringify({ exportedAt: new Date().toISOString(), transactions: filteredTransactions }, null, 2),
      'savings-tracker-history.json',
      'application/json'
    );
  };

  const handleExportCsv = async () => {
    await exportText(transactionsToCsv(filteredTransactions), 'savings-tracker-history.csv', 'text/csv');
  };

  const handleClearHistory = () => {
    if (transactions.length === 0) {
      Alert.alert('No History', 'There is no transaction history to clear.');
      return;
    }

    Alert.alert(
      'Clear History',
      `This will permanently delete ${transactions.length} transaction record(s). Assets and goals will stay unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            setPendingClearCount(transactions.length);
            clearTimerRef.current = setTimeout(() => {
              clearTransactions();
              setPendingClearCount(0);
              clearTimerRef.current = null;
            }, 4000);
          },
        },
      ]
    );
  };

  const handleUndoClear = () => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setPendingClearCount(0);
  };

  const getAmountText = (tx: Transaction) => {
    if (tx.type === 'UPDATE' && tx.previousAmount !== undefined) {
      return `${formatAssetAmount(tx.assetType, tx.previousAmount)} to ${formatAssetAmount(tx.assetType, tx.amount)} ${tx.assetType}`;
    }
    const sign = tx.type === 'ADD' ? '+' : tx.type === 'REMOVE' ? '-' : '';
    return `${sign}${formatAssetAmount(tx.assetType, tx.amount)} ${tx.assetType}`;
  };

  const renderItem: ListRenderItem<Transaction> = ({ item }) => {
    const color = item.type === 'ADD' ? colors.success : item.type === 'REMOVE' ? colors.error : colors.warning;
    const icon = item.type === 'ADD' ? 'add' : item.type === 'REMOVE' ? 'remove' : 'swap-horizontal';

    return (
      <View
        style={[styles.historyItem, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
        accessibilityLabel={`${item.type} ${item.assetType}: ${getAmountText(item)}${item.note ? `, ${item.note}` : ''}`}
      >
        <View style={[styles.itemIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.gray900 }]}>{item.type} {item.assetType}</Text>
            <Text style={[styles.itemAmount, { color }]}>{getAmountText(item)}</Text>
          </View>
          {item.note ? <Text style={[styles.itemNote, { color: colors.gray600 }]}>{item.note}</Text> : null}
          <Text style={[styles.itemDate, { color: colors.gray400 }]}>{formatRelativeDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  const filtersActive = query.trim() || typeFilter !== 'ALL' || assetFilter !== 'ALL' || dateFilter !== 'ALL';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>History</Text>
        <TouchableOpacity onPress={handleClearHistory} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Clear transaction history">
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tools, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.gray100, color: colors.gray900 }]}
          placeholder="Search history..."
          placeholderTextColor={colors.gray400}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search transaction history"
        />
        <View style={styles.filterRows}>
          <View style={styles.filterRow}>
            {TYPE_FILTERS.map((filter) => (
              <FilterPill key={filter} label={filter} selected={typeFilter === filter} onPress={() => setTypeFilter(filter)} />
            ))}
          </View>
          <View style={styles.filterRow}>
            {ASSET_FILTERS.map((filter) => (
              <FilterPill key={filter} label={filter} selected={assetFilter === filter} onPress={() => setAssetFilter(filter)} />
            ))}
          </View>
          <View style={styles.filterRow}>
            {DATE_FILTERS.map((filter) => (
              <FilterPill key={filter} label={filter} selected={dateFilter === filter} onPress={() => setDateFilter(filter)} />
            ))}
          </View>
        </View>
        <View style={styles.exportRow}>
          <Text style={[styles.resultText, { color: colors.gray500 }]}>{filteredTransactions.length} record(s)</Text>
          {filtersActive ? (
            <TouchableOpacity onPress={resetFilters} accessibilityRole="button" accessibilityLabel="Reset history filters">
              <Text style={[styles.linkText, { color: colors.primary }]}>Reset filters</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={handleExportJson} accessibilityRole="button" accessibilityLabel="Export history JSON">
            <Text style={[styles.linkText, { color: colors.primary }]}>JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportCsv} accessibilityRole="button" accessibilityLabel="Export history CSV">
            <Text style={[styles.linkText, { color: colors.primary }]}>CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filteredTransactions.length ? styles.listContent : styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>No activity found</Text>
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Add, edit, or remove assets to build history.</Text>
          </View>
        }
      />
      {pendingClearCount > 0 && (
        <View style={[styles.snackbar, { backgroundColor: colors.gray900 }]}>
          <Text style={[styles.snackbarText, { color: colors.bgPrimary }]}>
            Clearing {pendingClearCount} history record(s)
          </Text>
          <TouchableOpacity onPress={handleUndoClear} accessibilityRole="button" accessibilityLabel="Undo clear history">
            <Text style={[styles.snackbarAction, { color: colors.primaryLight }]}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );

  function FilterPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity
        style={[styles.filterPill, { backgroundColor: selected ? colors.primary : colors.gray200 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Filter history by ${label}`}
        accessibilityState={{ selected }}
      >
        <Text style={[styles.filterPillText, { color: selected ? colors.onPrimary : colors.gray700 }]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tools: { padding: SPACING.md, borderBottomWidth: 1, gap: SPACING.sm },
  searchInput: { minHeight: 44, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, fontSize: 14 },
  filterRows: { gap: SPACING.xs },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  filterPill: { minHeight: 36, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  filterPillText: { fontSize: 12, fontWeight: '700' },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  resultText: { flex: 1, fontSize: 12, fontWeight: '600' },
  linkText: { fontSize: 13, fontWeight: '700' },
  listContent: { padding: SPACING.md, gap: SPACING.sm },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  emptyState: { alignItems: 'center', gap: SPACING.xs },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  historyItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  itemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginEnd: SPACING.md },
  itemBody: { flex: 1, gap: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  itemAmount: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  itemNote: { fontSize: 12 },
  itemDate: { fontSize: 11 },
  snackbar: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.lg,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  snackbarText: { flex: 1, fontSize: 14, fontWeight: '700' },
  snackbarAction: { fontSize: 14, fontWeight: '800' },
});
