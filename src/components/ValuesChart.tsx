import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { VictoryBar, VictoryAxis, VictoryChart, VictoryTheme } from 'victory-native';
import { PortfolioSummary } from '../utils/assetCalculations';
import { SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { buildValuesChartData } from '../utils/chartData';

interface ValuesChartProps {
  summary: PortfolioSummary;
}

export default function ValuesChart({ summary }: ValuesChartProps) {
  const { colors } = useTheme();
  const chartData = useMemo(() => {
    const assetColors = {
      USD: colors.assetUSD,
      SYP: colors.assetSYP,
      GOLD: colors.assetGOLD,
      SILVER: colors.assetSILVER,
    };

    return buildValuesChartData(summary, assetColors);
  }, [colors.assetGOLD, colors.assetSILVER, colors.assetSYP, colors.assetUSD, summary]);

  const windowWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(windowWidth - 32, 400);

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
      accessibilityLabel={`Asset values chart: ${chartData.map((item) => `${item.x} ${item.displayValue} USD`).join(', ')}`}
    >
      <VictoryChart width={chartWidth} height={250} theme={VictoryTheme.material}>
        <VictoryAxis
          style={{
            axis: { stroke: colors.gray200, strokeWidth: 1 },
            tickLabels: { fontSize: 11, fill: colors.gray600 },
            grid: { stroke: colors.transparent },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.gray200, strokeWidth: 1 },
            tickLabels: { fontSize: 10, fill: colors.gray600 },
            grid: { stroke: colors.gray100, strokeWidth: 0.5 },
          }}
        />
        <VictoryBar
          data={chartData}
          x="x"
          y="y"
          style={{
            data: {
              fill: ({ datum }) => datum.color,
              width: 40,
            },
          }}
        />
      </VictoryChart>
      {chartData.some((item) => item.isNearZero) && (
        <Text style={[styles.chartHint, { color: colors.gray500 }]}>
          Values under 0.01 USD are shown at the minimum visible height.
        </Text>
      )}
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
    overflow: 'hidden',
    minHeight: 180,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
