import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, I18nManager } from 'react-native';
import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter, VictoryTheme } from 'victory-native';
import { PortfolioSnapshot } from '../store/usePortfolioSnapshotsStore';
import { BORDER_RADIUS, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { buildTrendChartData, TrendRange } from '../utils/trends';

interface TrendChartProps {
  snapshots: PortfolioSnapshot[];
  range: TrendRange;
}

export default function TrendChart({ snapshots, range }: TrendChartProps) {
  const { colors } = useTheme();
  const chartData = useMemo(() => buildTrendChartData(snapshots, range), [range, snapshots]);
  const windowWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(windowWidth - 32, 420);
  const chartPadding = {
    top: 20,
    bottom: 44,
    [I18nManager.isRTL ? 'right' : 'left']: 52,
    [I18nManager.isRTL ? 'left' : 'right']: 24,
  };

  if (chartData.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
        <Text style={[styles.emptyTitle, { color: colors.gray700 }]}>Trend starts after two snapshots</Text>
        <Text style={[styles.emptyText, { color: colors.gray400 }]}>Refresh prices over time to build your portfolio history.</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
      accessibilityLabel={`Portfolio trend chart with ${chartData.length} snapshots`}
    >
      <VictoryChart width={chartWidth} height={220} theme={VictoryTheme.material} padding={chartPadding}>
        <VictoryAxis
          tickFormat={(tick) => tick}
          style={{
            axis: { stroke: colors.gray200 },
            tickLabels: { fontSize: 10, fill: colors.gray600, angle: -25, padding: 16 },
            grid: { stroke: colors.transparent },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(tick) => `$${Math.round(Number(tick))}`}
          style={{
            axis: { stroke: colors.gray200 },
            tickLabels: { fontSize: 10, fill: colors.gray600 },
            grid: { stroke: colors.gray100, strokeWidth: 0.5 },
          }}
        />
        <VictoryLine
          data={chartData}
          style={{ data: { stroke: colors.primary, strokeWidth: 3 } }}
        />
        <VictoryScatter
          data={chartData}
          size={4}
          style={{ data: { fill: colors.primary } }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    minHeight: 180,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
