import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { VictoryPie, VictoryLabel } from 'victory-native';
import { PortfolioSummary } from '../utils/assetCalculations';
import { SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { buildDistributionChartData } from '../utils/chartData';

interface DistributionChartProps {
  summary: PortfolioSummary;
}

export default function DistributionChart({ summary }: DistributionChartProps) {
  const { colors } = useTheme();
  const chartData = useMemo(() => {
    const assetColors = {
      USD: colors.assetUSD,
      SYP: colors.assetSYP,
      GOLD: colors.assetGOLD,
      SILVER: colors.assetSILVER,
    };

    return buildDistributionChartData(summary, assetColors, colors.gray300);
  }, [colors.assetGOLD, colors.assetSILVER, colors.assetSYP, colors.assetUSD, colors.gray300, summary]);

  const windowWidth = Dimensions.get('window').width;
  const chartSize = Math.min(windowWidth - 32, 300);

  if (chartData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}>
        <Text style={[styles.emptyText, { color: colors.gray400 }]}>No data yet</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgPrimary, borderColor: colors.gray200 }]}
      accessibilityLabel={`Distribution chart: ${chartData.map((item) => `${item.y.toFixed(1)}% ${item.x}`).join(', ')}`}
    >
      <VictoryPie
        data={chartData}
        x="x"
        y="y"
        colorScale={chartData.map((d) => d.color)}
        width={chartSize}
        height={chartSize}
        innerRadius={60}
        labels={() => ''}
        labelComponent={<VictoryLabel style={{ fontSize: 11, fontWeight: '600' }} />}
        style={{
          data: {
            stroke: colors.bgPrimary,
            strokeWidth: 2,
          },
          labels: {
            fill: colors.onPrimary,
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      />
      <View style={styles.legend}>
        {chartData.map((item) => (
          <View key={item.x} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.gray700 }]} numberOfLines={1}>
              {item.x} {item.y.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
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
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legend: {
    width: '100%',
    gap: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});
