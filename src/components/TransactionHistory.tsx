import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore, Transaction, TransactionType } from '../store/useTransactionStore';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../theme';
import { AssetType } from '../store/useAssetsStore';
import { formatAssetAmount, formatRelativeDate } from '../utils/format';

interface TransactionHistoryProps {
  limit?: number;
  assetType?: AssetType;
  showHeader?: boolean;
  onViewAll?: () => void;
}

const TRANSACTION_ICONS: Record<TransactionType, keyof typeof Ionicons.glyphMap> = {
  ADD: 'add',
  REMOVE: 'remove',
  UPDATE: 'swap-horizontal',
};

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  ADD: 'Added',
  REMOVE: 'Removed',
  UPDATE: 'Updated',
};

export default function TransactionHistory({
  limit = 20,
  assetType,
  showHeader = true,
  onViewAll,
}: TransactionHistoryProps) {
  const transactions = useTransactionStore((state) => state.transactions);
  const { colors } = useTheme();

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (assetType) {
      result = result.filter((tx) => tx.assetType === assetType);
    }

    return result.slice(0, limit);
  }, [transactions, assetType, limit]);

  const formatAmount = (tx: Transaction): string => {
    const sign = tx.type === 'REMOVE' ? '-' : tx.type === 'ADD' ? '+' : '';
    return `${sign}${formatAssetAmount(tx.assetType, tx.amount)}`;
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'ADD': return colors.success;
      case 'REMOVE': return colors.error;
      case 'UPDATE': return colors.warning;
      default: return colors.gray500;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View
      style={[styles.transactionItem, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
      accessibilityLabel={`${TRANSACTION_LABELS[item.type]} ${item.assetType}: ${formatAssetAmount(item.assetType, item.amount)}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: getTypeColor(item.type) + '20' }]}>
        <Ionicons name={TRANSACTION_ICONS[item.type]} size={18} color={getTypeColor(item.type)} />
      </View>

      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionLabel, { color: colors.gray900 }]}>
            {TRANSACTION_LABELS[item.type]} {item.assetType}
          </Text>
          <Text style={[styles.transactionAmount, { color: getTypeColor(item.type) }]}>
            {formatAmount(item)}
          </Text>
        </View>

        {item.type === 'UPDATE' && item.previousAmount !== undefined && (
          <Text style={[styles.previousAmount, { color: colors.gray500 }]}>
            {formatAssetAmount(item.assetType, item.previousAmount)} to {formatAssetAmount(item.assetType, item.amount)} {item.assetType}
          </Text>
        )}

        <View style={styles.transactionFooter}>
          {item.note && (
            <Text style={[styles.transactionNote, { color: colors.gray600 }]} numberOfLines={1}>
              {item.note}
            </Text>
          )}
          <Text style={[styles.transactionDate, { color: colors.gray400 }]}>
            {formatRelativeDate(item.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );

  const emptyContent = (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.gray400 }]}>
        No activity yet
      </Text>
    </View>
  );

  if (filteredTransactions.length === 0 && !showHeader) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Recent Activity</Text>
          {onViewAll && transactions.length > limit && (
            <TouchableOpacity onPress={onViewAll} accessibilityRole="button" accessibilityLabel="View all transactions">
              <Text style={[styles.viewAllBtn, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListEmptyComponent={emptyContent}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllBtn: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    gap: SPACING.sm,
  },
  transactionItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  transactionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  previousAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  transactionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  transactionDate: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 14,
  },
});
