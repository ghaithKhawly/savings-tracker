import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import useAssetsStore from '../store/useAssetsStore';
import useGoalsStore from '../store/useGoalsStore';
import usePortfolioSnapshotsStore from '../store/usePortfolioSnapshotsStore';
import { getLivePrices, PriceData } from '../services/priceService';
import { getPortfolioSummary } from '../utils/assetCalculations';
import DistributionChart from '../components/DistributionChart';
import ValuesChart from '../components/ValuesChart';
import TransactionHistory from '../components/TransactionHistory';
import TrendChart from '../components/TrendChart';
import AssetFormModal, { AssetFormData } from '../components/AssetFormModal';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { SPACING, BORDER_RADIUS } from '../theme';
import { formatCurrencyValue, formatPlainNumber, formatRelativeDate, formatSensitiveCurrencyValue } from '../utils/format';
import { summarizeGoals } from '../utils/goals';
import { calculateTrendDelta, TrendRange } from '../utils/trends';
import { RootTabName, RootTabParamList } from '../navigation/types';

export default function Dashboard() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const assets = useAssetsStore((state) => state.assets);
  const addAsset = useAssetsStore((state) => state.addAsset);
  const goals = useGoalsStore((state) => state.goals);
  const snapshots = usePortfolioSnapshotsStore((state) => state.snapshots);
  const recordSnapshot = usePortfolioSnapshotsStore((state) => state.recordSnapshot);
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [assetFormVisible, setAssetFormVisible] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>('7d');

  const { colors } = useTheme();
  const { settings } = useSettings();

  const fetchPrices = async () => {
    try {
      setError(null);
      const result = await getLivePrices();
      if (result.error) {
        setError(result.error);
        // Still set prices if we got fallback data
        if (result.data && result.data.usdToSyp) {
          setPrices(result.data);
        }
      } else {
        setPrices(result.data);
      }
    } catch {
      setError('Failed to fetch prices');
      setPrices(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch prices on mount
  useEffect(() => {
    fetchPrices();
  }, []);

  // Refetch prices when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Optionally refetch; for now just ensure we have data
      if (!prices && !loading) {
        setLoading(true);
        fetchPrices();
      }
    }, [prices, loading])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrices();
  };

  const summary = prices ? getPortfolioSummary(assets, prices) : null;
  const goalPreview = useMemo(
    () => summarizeGoals(goals, assets, prices, 3),
    [assets, goals, prices]
  );
  const trendDelta = useMemo(
    () => calculateTrendDelta(snapshots, trendRange),
    [snapshots, trendRange]
  );
  const summaryTotalUsd = summary?.totalUsd;

  useEffect(() => {
    if (summaryTotalUsd !== undefined && prices && assets.length > 0) {
      recordSnapshot(summaryTotalUsd, prices);
    }
  }, [assets.length, prices, prices?.lastUpdated, recordSnapshot, summaryTotalUsd]);

  const formatDisplayValue = (usdValue: number): string => {
    return formatSensitiveCurrencyValue(usdValue, settings, prices?.usdToSyp);
  };

  const getLastUpdateTime = () => {
    if (!prices?.lastUpdated) return 'Never';
    return formatRelativeDate(prices.lastUpdated);
  };

  const largestAsset = summary?.byAsset.reduce(
    (largest, asset) => (asset.amountInUsd > largest.amountInUsd ? asset : largest),
    summary.byAsset[0]
  );
  const nearestGoal = goalPreview.find((item) => !item.isComplete);
  const diversificationSummary = summary
    ? (Object.entries(summary.distribution) as [keyof typeof summary.distribution, number][])
      .filter(([, percent]) => percent > 0)
      .sort((a, b) => b[1] - a[1])
    : [];
  const dominantAsset = diversificationSummary[0];
  const priceSourceLabel = prices?.source === 'live'
    ? 'Live'
    : prices?.source === 'cache'
      ? 'Fresh cache'
      : prices?.source === 'stale-cache'
        ? 'Stale cache'
        : prices?.source === 'demo' || prices?.isDemo
          ? 'Demo'
          : prices?.source === 'manual'
            ? 'Manual'
            : 'Unknown';
  const allocationGap = dominantAsset
    ? Math.abs((dominantAsset[1] ?? 0) - (settings.allocationTargets[dominantAsset[0]] ?? 0))
    : 0;

  const handleAssetSubmit = (data: AssetFormData) => {
    addAsset(data);
    setAssetFormVisible(false);
  };

  const navigateTo = (screen: RootTabName) => {
    navigation.navigate(screen);
  };

  const renderSkeletonBlock = (width: `${number}%`, height: number) => (
    <View style={[styles.skeletonBlock, { width, height, backgroundColor: colors.gray200 }]} />
  );

  function InsightCard({
    icon,
    title,
    value,
    detail,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    detail: string;
  }) {
    return (
      <View style={[styles.insightCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
        <View style={styles.insightHeader}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <Text style={[styles.insightTitle, { color: colors.gray500 }]}>{title}</Text>
        </View>
        <Text style={[styles.insightValue, { color: colors.gray900 }]} numberOfLines={1}>{value}</Text>
        <Text style={[styles.insightDetail, { color: colors.gray500 }]} numberOfLines={2}>{detail}</Text>
      </View>
    );
  }

  if (loading && !prices) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]} accessibilityRole="header">Dashboard</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} accessibilityLabel="Dashboard loading">
          <View style={[styles.skeletonCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
            {renderSkeletonBlock('40%', 14)}
            {renderSkeletonBlock('72%', 34)}
            {renderSkeletonBlock('55%', 12)}
          </View>
          <View style={styles.summaryGrid}>
            {[0, 1, 2].map((item) => (
              <View key={item} style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                {renderSkeletonBlock('65%', 12)}
                {renderSkeletonBlock('45%', 20)}
              </View>
            ))}
          </View>
          <View style={[styles.chartSkeleton, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
            {renderSkeletonBlock('35%', 14)}
            {renderSkeletonBlock('80%', 140)}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Dashboard content"
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.gray200 }]}>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]} accessibilityRole="header">Dashboard</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh prices"
            accessibilityState={{ disabled: refreshing }}
          >
            <Ionicons name={refreshing ? 'sync' : 'refresh'} size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Demo/cache/offline status */}
        {prices?.isDemo ? (
          <View style={[styles.statusBanner, { backgroundColor: colors.warningLight }]} accessibilityRole="alert">
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <Text style={[styles.demoText, { color: colors.warning }]}>Demo mode - using sample prices</Text>
          </View>
        ) : error && prices ? (
          <View style={[styles.statusBanner, { backgroundColor: colors.warningLight }]} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <View style={styles.statusTextBlock}>
              <Text style={[styles.demoText, { color: colors.warning }]}>Using cached prices</Text>
              <Text style={[styles.errorHint, { color: colors.gray600 }]}>{error}</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Retry price refresh">
              <Text style={[styles.retryText, { color: colors.warning }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderStartColor: colors.error }]} accessibilityRole="alert">
            <Text style={[styles.errorText, { color: colors.errorDark }]}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} accessibilityRole="button" accessibilityLabel="Retry price refresh">
              <Text style={[styles.retryText, { color: colors.errorDark }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!summary ? (
          <View style={styles.emptyState} accessibilityRole="text">
            <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Unable to calculate summary</Text>
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Please try refreshing prices</Text>
          </View>
        ) : (
          <>
            <View
              style={[styles.totalCard, { backgroundColor: colors.primary }]}
              accessibilityRole="text"
              accessibilityLabel={`Total savings: ${formatDisplayValue(summary.totalUsd)}`}
            >
              <View style={styles.totalHeader}>
                <Text style={[styles.totalLabel, { color: colors.onPrimaryMuted }]}>Total Savings</Text>
                <TouchableOpacity
                  style={[styles.quickAddButton, { backgroundColor: colors.onPrimaryMuted }]}
                  onPress={() => setAssetFormVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Quick add asset"
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={[styles.quickAddText, { color: colors.primary }]}>Quick Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.totalValue, { color: colors.onPrimary }]}>{formatDisplayValue(summary.totalUsd)}</Text>
              <Text style={[styles.lastUpdate, { color: colors.onPrimarySubtle }]}>
                Last updated: {getLastUpdateTime()}
                {settings.currencyDisplay === 'SYP' && ' - Showing in SYP'}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>Assets</Text>
                <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{assets.length}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>Largest</Text>
                <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{largestAsset?.type || 'None'}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>Updated</Text>
                <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{getLastUpdateTime()}</Text>
              </View>
            </View>

            <View style={styles.insightGrid} accessibilityLabel="Portfolio insights">
              <InsightCard
                icon="analytics-outline"
                title="Largest exposure"
                value={largestAsset ? `${largestAsset.type} ${summary.distribution[largestAsset.type].toFixed(0)}%` : 'None'}
                detail={largestAsset ? formatDisplayValue(largestAsset.amountInUsd) : 'Add an asset to start'}
              />
              <InsightCard
                icon="flag-outline"
                title="Nearest goal"
                value={nearestGoal ? `${nearestGoal.goal.title} ${nearestGoal.progress.toFixed(0)}%` : 'No active goal'}
                detail={nearestGoal ? `${formatDisplayValue(nearestGoal.remainingUsd)} remaining` : 'Create a target in Goals'}
              />
              <InsightCard
                icon={trendDelta && trendDelta.changeUsd >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                title="Recent change"
                value={trendDelta ? `${trendDelta.changeUsd >= 0 ? '+' : ''}${formatDisplayValue(trendDelta.changeUsd)}` : 'No trend yet'}
                detail={trendDelta?.changePercent !== null && trendDelta ? `${trendDelta.changePercent.toFixed(1)}% over ${trendRange}` : 'Snapshots build automatically'}
              />
              <InsightCard
                icon="git-compare-outline"
                title="Diversification"
                value={dominantAsset ? `${dominantAsset[0]} leads` : 'No mix yet'}
                detail={dominantAsset ? `${allocationGap.toFixed(0)} pts from target` : 'Set asset targets in Settings'}
              />
              <InsightCard
                icon="shield-checkmark-outline"
                title="Price trust"
                value={priceSourceLabel}
                detail={`Updated ${getLastUpdateTime()}`}
              />
            </View>

            {assets.length === 0 && (
              <View style={[styles.emptyPrompt, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                <View style={styles.emptyPromptText}>
                  <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>No assets recorded</Text>
                  <Text style={[styles.emptyText, { color: colors.gray400 }]}>Add your first entry to activate totals, goals, and trends.</Text>
                </View>
                <TouchableOpacity
                  style={[styles.emptyAction, { backgroundColor: colors.primary }]}
                  onPress={() => setAssetFormVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add asset"
                >
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={[styles.emptyActionText, { color: colors.onPrimary }]}>Add Asset</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section} accessibilityLabel="Goals section">
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Goals</Text>
                <TouchableOpacity onPress={() => navigateTo('Goals')} accessibilityRole="button" accessibilityLabel="View all goals">
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
                </TouchableOpacity>
              </View>
              {goalPreview.length === 0 ? (
                <View style={[styles.infoCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                  <Text style={[styles.infoTitle, { color: colors.gray900 }]}>No goals yet</Text>
                  <Text style={[styles.infoText, { color: colors.gray500 }]}>Create a savings target and track progress here.</Text>
                </View>
              ) : (
                goalPreview.map((item) => (
                  <View key={item.goal.id} style={[styles.goalPreviewCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                    <View style={styles.goalPreviewHeader}>
                      <Text style={[styles.goalPreviewTitle, { color: colors.gray900 }]}>{item.goal.title}</Text>
                      <Text style={[styles.goalPreviewValue, { color: item.isComplete ? colors.success : colors.primary }]}>{item.progress.toFixed(0)}%</Text>
                    </View>
                    <View style={[styles.goalTrack, { backgroundColor: colors.gray100 }]}>
                      <View style={[styles.goalFill, { backgroundColor: item.isComplete ? colors.success : colors.primary, width: `${item.progress}%` }]} />
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section} accessibilityLabel="Portfolio trend section">
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Portfolio Trend</Text>
                <View style={styles.rangeTabs}>
                  {(['7d', '30d', 'all'] as TrendRange[]).map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[styles.rangeTab, { backgroundColor: trendRange === range ? colors.primary : colors.gray200 }]}
                      onPress={() => setTrendRange(range)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${range} portfolio trend`}
                      accessibilityState={{ selected: trendRange === range }}
                    >
                      <Text style={[styles.rangeText, { color: trendRange === range ? colors.onPrimary : colors.gray700 }]}>{range.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {trendDelta ? (
                <Text style={[styles.trendDelta, { color: trendDelta.changeUsd >= 0 ? colors.success : colors.error }]}>
                  {trendDelta.changeUsd >= 0 ? '+' : ''}{formatCurrencyValue(trendDelta.changeUsd, { ...settings, currencyDisplay: 'USD' })}
                  {trendDelta.changePercent !== null ? ` (${trendDelta.changePercent.toFixed(1)}%)` : ''}
                </Text>
              ) : null}
              <TrendChart snapshots={snapshots} range={trendRange} />
            </View>

            <View style={styles.section} accessibilityLabel="Asset distribution chart">
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Asset Distribution</Text>
              <DistributionChart summary={summary} />
            </View>

            <View style={styles.section} accessibilityLabel="Asset values chart">
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Asset Values</Text>
              {settings.hideBalances ? (
                <View style={[styles.infoCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                  <Text style={[styles.infoTitle, { color: colors.gray900 }]}>Balances hidden</Text>
                  <Text style={[styles.infoText, { color: colors.gray500 }]}>Turn off Hide Balances in Settings to view asset values.</Text>
                </View>
              ) : (
                <ValuesChart summary={summary} />
              )}
            </View>

            {/* Per-Asset Breakdown */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Breakdown</Text>
              {summary.byAsset.length === 0 ? (
                <View style={[styles.infoCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
                  <Text style={[styles.infoText, { color: colors.gray500 }]}>No asset breakdown yet.</Text>
                </View>
              ) : (
                summary.byAsset.map((asset) => (
                  <View
                    key={asset.type}
                    style={[styles.assetCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
                    accessibilityLabel={`${asset.type}: ${formatDisplayValue(asset.amountInUsd)}, ${summary.distribution[asset.type].toFixed(1)} percent of portfolio`}
                  >
                    <View style={styles.assetHeader}>
                      <Text style={[styles.assetType, { color: colors.primary }]}>{asset.type}</Text>
                      <Text style={[styles.assetCount, { color: colors.gray400 }]}>{asset.count} entry(ies)</Text>
                    </View>
                    <View style={styles.assetFooter}>
                      <Text style={[styles.assetValue, { color: colors.gray900 }]}>{formatDisplayValue(asset.amountInUsd)}</Text>
                      <View style={[styles.percentageBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.percentageText, { color: colors.primary }]}>
                          {summary.distribution[asset.type].toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <TransactionHistory limit={5} showHeader={true} onViewAll={() => navigateTo('History')} />
            </View>

            <View style={styles.section} accessibilityLabel="Current exchange rates">
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Exchange Rates</Text>
              <View style={styles.ratesGrid}>
                <View style={[styles.rateCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]} accessibilityLabel={`1 US dollar equals ${formatPlainNumber(prices?.usdToSyp || 0, 2)} Syrian pounds`}>
                  <View style={styles.rateLabelRow}>
                    <Text style={[styles.rateLabel, { color: colors.gray400 }]}>USD</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.gray400} />
                    <Text style={[styles.rateLabel, { color: colors.gray400 }]}>SYP</Text>
                  </View>
                  <Text style={[styles.rateValue, { color: colors.gray900 }]}>1 USD = {formatPlainNumber(prices?.usdToSyp || 0, 2)} SYP</Text>
                </View>
                <View style={[styles.rateCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]} accessibilityLabel={`Gold price: ${formatPlainNumber(prices?.goldPerGram || 0, 2)} dollars per gram`}>
                  <Text style={[styles.rateLabel, { color: colors.gray400 }]}>Gold (per gram)</Text>
                  <Text style={[styles.rateValue, { color: colors.gray900 }]}>{formatCurrencyValue(prices?.goldPerGram || 0, { ...settings, currencyDisplay: 'USD' })}</Text>
                </View>
                <View style={[styles.rateCard, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]} accessibilityLabel={`Silver price: ${formatPlainNumber(prices?.silverPerGram || 0, 4)} dollars per gram`}>
                  <Text style={[styles.rateLabel, { color: colors.gray400 }]}>Silver (per gram)</Text>
                  <Text style={[styles.rateValue, { color: colors.gray900 }]}>{formatCurrencyValue(prices?.silverPerGram || 0, { ...settings, currencyDisplay: 'USD' })}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <AssetFormModal
        visible={assetFormVisible}
        onSubmit={handleAssetSubmit}
        onCancel={() => setAssetFormVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
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
  refreshBtn: {
    padding: SPACING.sm,
  },
  skeletonCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  skeletonBlock: {
    borderRadius: BORDER_RADIUS.sm,
  },
  chartSkeleton: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusBanner: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  statusTextBlock: {
    flex: 1,
  },
  demoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderStartWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  errorHint: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPrompt: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  emptyPromptText: {
    gap: SPACING.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
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
  totalCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  insightCard: {
    width: '48%',
    minHeight: 104,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  insightTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  insightDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    minHeight: 74,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  lastUpdate: {
    fontSize: 12,
  },
  section: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: 13,
  },
  goalPreviewCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  goalPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  goalPreviewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  goalPreviewValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
  },
  rangeTabs: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  rangeTab: {
    minHeight: 32,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  trendDelta: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  assetCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  assetType: {
    fontSize: 16,
    fontWeight: '700',
  },
  assetCount: {
    fontSize: 12,
  },
  assetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentageBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratesGrid: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  rateCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  rateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
