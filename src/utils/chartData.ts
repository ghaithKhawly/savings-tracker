import { PortfolioSummary } from './assetCalculations';

export interface DistributionChartDatum {
  x: string;
  y: number;
  color: string;
}

export interface ValuesChartDatum {
  x: string;
  y: number;
  color: string;
  displayValue: number;
  isNearZero: boolean;
}

export function buildDistributionChartData(
  summary: PortfolioSummary,
  assetColors: Record<string, string>,
  otherColor: string,
  minPercent = 1
): DistributionChartDatum[] {
  let otherPercent = 0;
  const visible: DistributionChartDatum[] = [];

  summary.byAsset.forEach((asset) => {
    const percent = summary.distribution[asset.type] || 0;
    if (percent <= 0) return;

    if (percent < minPercent) {
      otherPercent += percent;
      return;
    }

    visible.push({
      x: asset.type,
      y: Number(percent.toFixed(2)),
      color: assetColors[asset.type],
    });
  });

  if (otherPercent > 0) {
    visible.push({
      x: 'Other',
      y: Number(otherPercent.toFixed(2)),
      color: otherColor,
    });
  }

  return visible;
}

export function buildValuesChartData(
  summary: PortfolioSummary,
  assetColors: Record<string, string>,
  minVisibleUsd = 0.01
): ValuesChartDatum[] {
  return summary.byAsset
    .filter((asset) => asset.amountInUsd > 0)
    .map((asset) => {
      const rounded = Math.round(asset.amountInUsd * 100) / 100;
      const isNearZero = rounded === 0;

      return {
        x: asset.type,
        y: isNearZero ? minVisibleUsd : rounded,
        displayValue: asset.amountInUsd,
        isNearZero,
        color: assetColors[asset.type],
      };
    });
}
