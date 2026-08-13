import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  I18nManager,
  ListRenderItem,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAssetsStore, { Asset, AssetType } from '../store/useAssetsStore';
import AssetFormModal, { AssetFormData } from '../components/AssetFormModal';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, COLORS } from '../theme';
import { formatAssetDisplay, formatRelativeDate } from '../utils/format';

type SortOption = 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'type';
type FilterOption = 'ALL' | AssetType;
type ThemeColors = typeof COLORS;

interface AssetRowProps {
  item: Asset;
  colors: ThemeColors;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

const AssetRow = memo(function AssetRow({ item, colors, onEdit, onDelete }: AssetRowProps) {
  const displayAmount = formatAssetDisplay(item.type, item.amount);

  return (
    <View
      style={[styles.listItem, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
      accessibilityLabel={`${item.type} asset: ${displayAmount}${item.note ? `, note: ${item.note}` : ''}`}
    >
      <View style={styles.itemInfo}>
        <Text style={[styles.itemType, { color: colors.primary }]}>{item.type}</Text>
        <Text style={[styles.itemAmount, { color: colors.gray900 }]}>{displayAmount}</Text>
        {item.note && <Text style={[styles.itemNote, { color: colors.gray600 }]}>{item.note}</Text>}
        <Text style={[styles.itemDate, { color: colors.gray400 }]}>
          {formatRelativeDate(item.createdAt)}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => onEdit(item)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.type} asset, ${displayAmount}`}
        >
          <Ionicons name="pencil" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.errorLight }]}
          onPress={() => onDelete(item)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.type} asset, ${displayAmount}`}
        >
          <Ionicons name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function Assets() {
  const assets = useAssetsStore((state) => state.assets);
  const addAsset = useAssetsStore((state) => state.addAsset);
  const removeAsset = useAssetsStore((state) => state.removeAsset);
  const updateAsset = useAssetsStore((state) => state.updateAsset);

  const { colors } = useTheme();
  
  const [formVisible, setFormVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('ALL');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let result = [...assets];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (asset) =>
          asset.type.toLowerCase().includes(query) ||
          asset.amount.toString().includes(query) ||
          (asset.note && asset.note.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (filterBy !== 'ALL') {
      result = result.filter((asset) => asset.type === filterBy);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'amount-high':
        result.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-low':
        result.sort((a, b) => a.amount - b.amount);
        break;
      case 'type':
        result.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return result;
  }, [assets, searchQuery, sortBy, filterBy]);

  const assetTypeTotals = useMemo(() => {
    return (['USD', 'SYP', 'GOLD', 'SILVER'] as AssetType[]).map((type) => {
      const total = assets
        .filter((asset) => asset.type === type)
        .reduce((sum, asset) => sum + asset.amount, 0);

      return { type, total, count: assets.filter((asset) => asset.type === type).length };
    });
  }, [assets]);

  const handleAddPress = useCallback(() => {
    setEditingAsset(undefined);
    setFormVisible(true);
  }, []);

  const handleEditPress = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setFormVisible(true);
  }, []);

  const handleDeletePress = useCallback((asset: Asset) => {
    Alert.alert(
      'Delete Asset',
      `Remove ${formatAssetDisplay(asset.type, asset.amount)}? You can undo for a few seconds before it is finalized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (deleteTimerRef.current) {
              clearTimeout(deleteTimerRef.current);
            }
            setPendingDelete(asset);
            deleteTimerRef.current = setTimeout(() => {
              removeAsset(asset.id);
              setPendingDelete(null);
              deleteTimerRef.current = null;
            }, 4000);
          },
        },
      ]
    );
  }, [removeAsset]);

  const handleUndoDelete = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDelete(null);
  }, []);

  const handleFormSubmit = useCallback((data: AssetFormData) => {
    if (editingAsset) {
      updateAsset({
        ...editingAsset,
        ...data,
      });
    } else {
      addAsset(data);
    }
    setFormVisible(false);
    setEditingAsset(undefined);
  }, [addAsset, editingAsset, updateAsset]);

  const handleFormCancel = useCallback(() => {
    setFormVisible(false);
    setEditingAsset(undefined);
  }, []);

  const getSortLabel = (): string => {
    switch (sortBy) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'amount-high': return 'Amount high';
      case 'amount-low': return 'Amount low';
      case 'type': return 'A-Z Type';
      default: return 'Sort';
    }
  };

  const filterOptions: FilterOption[] = ['ALL', 'USD', 'SYP', 'GOLD', 'SILVER'];
  const filtersActive = Boolean(searchQuery.trim()) || filterBy !== 'ALL' || sortBy !== 'newest';

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterBy('ALL');
    setSortBy('newest');
    setFilterSheetVisible(false);
  }, []);

  const renderAssetItem = useCallback<ListRenderItem<Asset>>(
    ({ item }) => (
      <AssetRow
        item={item}
        colors={colors}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
      />
    ),
    [colors, handleDeletePress, handleEditPress]
  );

  const emptyContent = (
    <View style={styles.emptyState} accessibilityRole="text">
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
        {filtersActive ? 'No matching assets' : 'No assets yet'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray400 }]}>
        {filtersActive
          ? 'Try adjusting your search or filters' 
          : 'Tap "Add Asset" to get started'}
      </Text>
      <TouchableOpacity
        style={[styles.emptyAction, { backgroundColor: colors.primary }]}
        onPress={filtersActive ? resetFilters : handleAddPress}
        accessibilityRole="button"
        accessibilityLabel={filtersActive ? 'Reset filters' : 'Add asset'}
      >
        <Ionicons name={filtersActive ? 'refresh' : 'add'} size={18} color={colors.onPrimary} />
        <Text style={[styles.emptyActionText, { color: colors.onPrimary }]}>
          {filtersActive ? 'Reset filters' : 'Add Asset'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]} accessibilityRole="header">Assets</Text>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary }]} 
          onPress={handleAddPress}
          accessibilityRole="button"
          accessibilityLabel="Add new asset"
        >
          <Ionicons name="add" size={18} color={colors.onPrimary} />
          <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.gray100, color: colors.gray900 }]}
          placeholder="Search assets..."
          placeholderTextColor={colors.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search assets"
        />
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => setFilterSheetVisible(true)}
          accessibilityLabel={`Open sort controls. Current sort: ${getSortLabel()}`}
        >
          <Ionicons name="swap-vertical" size={14} color={colors.primary} />
          <Text style={[styles.sortBtnText, { color: colors.primary }]}>{getSortLabel()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: filterBy !== 'ALL' ? colors.primary : colors.gray200 }]}
          onPress={() => setFilterSheetVisible(true)}
          accessibilityLabel="Open asset filters"
        >
          <Ionicons name="filter" size={14} color={filterBy !== 'ALL' ? colors.onPrimary : colors.gray700} />
          <Text style={[styles.filterBtnText, { color: filterBy !== 'ALL' ? colors.onPrimary : colors.gray700 }]}>
            {filterBy === 'ALL' ? 'Filter' : filterBy}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryStrip, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
        {assetTypeTotals.map((item) => (
          <View key={item.type} style={[styles.summaryChip, { backgroundColor: colors.gray100 }]}>
            <Text style={[styles.summaryChipType, { color: colors.gray500 }]}>{item.type}</Text>
            <Text style={[styles.summaryChipValue, { color: colors.gray900 }]} numberOfLines={1}>
              {formatAssetDisplay(item.type, item.total)}
            </Text>
          </View>
        ))}
      </View>

      <AssetFilterSheet
        visible={filterSheetVisible}
        colors={colors}
        sortBy={sortBy}
        filterBy={filterBy}
        filterOptions={filterOptions}
        onChangeSort={setSortBy}
        onChangeFilter={setFilterBy}
        onReset={resetFilters}
        onClose={() => setFilterSheetVisible(false)}
      />

      {/* Results count */}
      {filtersActive && (
        <View style={styles.resultsInfo}>
          <Text style={[styles.resultsText, { color: colors.gray500 }]}>
            {filteredAndSortedAssets.length} of {assets.length} assets
          </Text>
          <TouchableOpacity onPress={resetFilters} accessibilityRole="button" accessibilityLabel="Reset filters">
            <Text style={[styles.resetText, { color: colors.primary }]}>Reset filters</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredAndSortedAssets}
        keyExtractor={(item) => item.id}
        renderItem={renderAssetItem}
        ListEmptyComponent={emptyContent}
        contentContainerStyle={filteredAndSortedAssets.length === 0 ? styles.emptyContainer : styles.listContent}
        scrollEnabled={filteredAndSortedAssets.length > 0}
      />

      <AssetFormModal
        visible={formVisible}
        asset={editingAsset}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />

      {pendingDelete && (
        <View style={[styles.snackbar, { backgroundColor: colors.gray900 }]}>
          <Text style={[styles.snackbarText, { color: colors.bgPrimary }]}>
            Deleting {formatAssetDisplay(pendingDelete.type, pendingDelete.amount)}
          </Text>
          <TouchableOpacity onPress={handleUndoDelete} accessibilityRole="button" accessibilityLabel="Undo delete">
            <Text style={[styles.snackbarAction, { color: colors.primaryLight }]}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

interface AssetFilterSheetProps {
  visible: boolean;
  colors: ThemeColors;
  sortBy: SortOption;
  filterBy: FilterOption;
  filterOptions: FilterOption[];
  onChangeSort: (sort: SortOption) => void;
  onChangeFilter: (filter: FilterOption) => void;
  onReset: () => void;
  onClose: () => void;
}

function AssetFilterSheet({
  visible,
  colors,
  sortBy,
  filterBy,
  filterOptions,
  onChangeSort,
  onChangeFilter,
  onReset,
  onClose,
}: AssetFilterSheetProps) {
  const sortOptions: SortOption[] = ['newest', 'oldest', 'amount-high', 'amount-low', 'type'];
  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'newest': return 'Newest first';
      case 'oldest': return 'Oldest first';
      case 'amount-high': return 'Amount high to low';
      case 'amount-low': return 'Amount low to high';
      case 'type': return 'Type A-Z';
      default: return sort;
    }
  };

  const content = (
    <View style={styles.sheetRoot}>
      <TouchableOpacity style={styles.sheetScrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" />
      <View style={[styles.sheetContent, { backgroundColor: colors.bgPrimary }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: colors.gray200 }]}>
          <Text style={[styles.sheetTitle, { color: colors.gray900 }]}>Sort and Filter</Text>
          <TouchableOpacity onPress={onClose} style={styles.sheetIconButton} accessibilityRole="button" accessibilityLabel="Close filters">
            <Ionicons name="close" size={22} color={colors.gray500} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sheetSectionTitle, { color: colors.gray500 }]}>Sort</Text>
        <View style={styles.sheetOptionGrid}>
          {sortOptions.map((option) => {
            const selected = sortBy === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.sheetOption, { backgroundColor: selected ? colors.primary : colors.gray200 }]}
                onPress={() => onChangeSort(option)}
                accessibilityRole="button"
                accessibilityLabel={`Sort assets by ${getSortLabel(option)}`}
                accessibilityState={{ selected }}
              >
                <Text style={[styles.sheetOptionText, { color: selected ? colors.onPrimary : colors.gray700 }]}>{getSortLabel(option)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sheetSectionTitle, { color: colors.gray500 }]}>Asset Type</Text>
        <View style={styles.sheetOptionGrid}>
          {filterOptions.map((option) => {
            const selected = filterBy === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.sheetOption, { backgroundColor: selected ? colors.primary : colors.gray200 }]}
                onPress={() => onChangeFilter(option)}
                accessibilityRole="button"
                accessibilityLabel={`Filter assets by ${option}`}
                accessibilityState={{ selected }}
              >
                <Text style={[styles.sheetOptionText, { color: selected ? colors.onPrimary : colors.gray700 }]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sheetActions}>
          <TouchableOpacity style={[styles.sheetReset, { borderColor: colors.gray200 }]} onPress={onReset} accessibilityRole="button" accessibilityLabel="Reset asset filters">
            <Text style={[styles.sheetResetText, { color: colors.gray700 }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sheetDone, { backgroundColor: colors.primary }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Apply asset filters">
            <Text style={[styles.sheetDoneText, { color: colors.onPrimary }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return visible ? <View style={styles.webSheetRoot}>{content}</View> : null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 44,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
  },
  addBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryStrip: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    borderBottomWidth: 1,
  },
  summaryChip: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
  },
  summaryChipType: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryChipValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  resultsText: {
    fontSize: 12,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  listItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginEnd: SPACING.md,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  itemNote: {
    fontSize: 12,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  itemDate: {
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  itemActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
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
  snackbarText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  snackbarAction: {
    fontSize: 14,
    fontWeight: '700',
  },
  webSheetRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  sheetContent: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingBottom: SPACING.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetIconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sheetOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  sheetOption: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sheetReset: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDone: {
    flex: 1,
    minHeight: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetResetText: {
    fontSize: 15,
    fontWeight: '800',
  },
  sheetDoneText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
