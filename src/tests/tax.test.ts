import { describe, expect, it } from 'vitest';
import { computeRevenue, effectiveRate } from '@/simulation/economy/tax';
import type { TaxPolicy } from '@/types';

const baseInput = {
  gdp: 2000,
  consumption: 1000,
  revenueCalibration: 0,
  modifierRevenue: 0,
};

const tax = (income: number, corporate: number, consumption: number): TaxPolicy => ({
  income,
  corporate,
  consumption,
});

describe('세입 계산', () => {
  it('세율을 올리면 세입이 늘어난다', () => {
    // Arrange
    const low = { ...baseInput, tax: tax(20, 22, 10) };
    const high = { ...baseInput, tax: tax(30, 22, 10) };

    // Act
    const lowRevenue = computeRevenue(low);
    const highRevenue = computeRevenue(high);

    // Assert
    expect(highRevenue.income).toBeGreaterThan(lowRevenue.income);
    expect(highRevenue.total).toBeGreaterThan(lowRevenue.total);
  });

  it('세목별로 독립적으로 반영된다', () => {
    // Arrange
    const base = { ...baseInput, tax: tax(22, 24, 10) };
    const corporateUp = { ...baseInput, tax: tax(22, 34, 10) };

    // Act
    const baseRevenue = computeRevenue(base);
    const raised = computeRevenue(corporateUp);

    // Assert
    expect(raised.corporate).toBeGreaterThan(baseRevenue.corporate);
    expect(raised.income).toBeCloseTo(baseRevenue.income, 8);
    expect(raised.consumption).toBeCloseTo(baseRevenue.consumption, 8);
  });

  it('세율이 높아질수록 실효 징수율의 증가폭이 줄어든다', () => {
    // Arrange & Act
    const lowStep = effectiveRate(20) - effectiveRate(10);
    const highStep = effectiveRate(60) - effectiveRate(50);

    // Assert
    expect(highStep).toBeLessThan(lowStep);
  });

  it('실효 징수율은 항상 0과 1 사이다', () => {
    // Arrange
    const rates = [-50, 0, 10, 45, 70, 100, 500];

    // Act
    const values = rates.map(effectiveRate);

    // Assert
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('비정상 입력이 들어와도 NaN 을 만들지 않는다', () => {
    // Arrange
    const broken = {
      gdp: Number.NaN,
      consumption: Number.POSITIVE_INFINITY,
      tax: tax(Number.NaN, 20, 10),
      revenueCalibration: Number.NaN,
      modifierRevenue: 0,
    };

    // Act
    const revenue = computeRevenue(broken);

    // Assert
    expect(Number.isFinite(revenue.total)).toBe(true);
    expect(revenue.total).toBeGreaterThanOrEqual(0);
  });
});
