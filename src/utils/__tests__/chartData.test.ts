import { PortfolioSummary } from '../assetCalculations';
import { buildDistributionChartData, buildValuesChartData } from '../chartData';

const colors = {
  USD: 'blue',
  SYP: 'red',
  GOLD: 'gold',
  SILVER: 'silver',
};

describe('chart data utilities', () => {
  it('groups tiny distribution slices into Other', () => {
    const summary: PortfolioSummary = {
      totalUsd: 1000,
      byAsset: [
        { type: 'USD', count: 1, amountInUsd: 990 },
        { type: 'SYP', count: 1, amountInUsd: 5 },
        { type: 'SILVER', count: 1, amountInUsd: 5 },
      ],
      distribution: {
        USD: 99,
        SYP: 0.5,
        GOLD: 0,
        SILVER: 0.5,
      },
    };

    expect(buildDistributionChartData(summary, colors, 'gray')).toEqual([
      { x: 'USD', y: 99, color: 'blue' },
      { x: 'Other', y: 1, color: 'gray' },
    ]);
  });

  it('uses a minimum visible value for nonzero near-zero bars', () => {
    const summary: PortfolioSummary = {
      totalUsd: 1000,
      byAsset: [
        { type: 'USD', count: 1, amountInUsd: 1000 },
        { type: 'SILVER', count: 1, amountInUsd: 0.004 },
      ],
      distribution: {
        USD: 99.9996,
        SYP: 0,
        GOLD: 0,
        SILVER: 0.0004,
      },
    };

    expect(buildValuesChartData(summary, colors)).toEqual([
      { x: 'USD', y: 1000, displayValue: 1000, isNearZero: false, color: 'blue' },
      { x: 'SILVER', y: 0.01, displayValue: 0.004, isNearZero: true, color: 'silver' },
    ]);
  });
});
