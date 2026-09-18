import { describe, expect, it } from 'vitest';
import {
  computeExpenditure,
  directPurchaseRatio,
  totalBudgetRatio,
} from '@/simulation/economy/spending';
import { computeInterestRate, debtToGdpRatio, updateDebt } from '@/simulation/economy/debt';
import { COUNTRIES } from '@/config/countries';

const budget = COUNTRIES.KOR.budget;

describe('정부 지출과 국가부채', () => {
  it('예산을 늘리면 총지출이 늘어난다', () => {
    // Arrange
    const base = {
      gdp: 2000,
      budget,
      unemployment: 4,
      debt: 1000,
      interestRate: 3,
      modifierSpending: 0,
    };
    const expanded = { ...base, budget: { ...budget, welfare: budget.welfare + 3 } };

    // Act
    const baseline = computeExpenditure(base);
    const raised = computeExpenditure(expanded);

    // Assert
    expect(raised.total).toBeGreaterThan(baseline.total);
    expect(raised.total - baseline.total).toBeCloseTo(2000 * 0.03, 5);
  });

  it('실업률이 높으면 자동안정화 지출이 늘어난다', () => {
    // Arrange
    const low = {
      gdp: 2000,
      budget,
      unemployment: 3,
      debt: 0,
      interestRate: 0,
      modifierSpending: 0,
    };
    const high = { ...low, unemployment: 10 };

    // Act & Assert
    expect(computeExpenditure(high).stabilizers).toBeGreaterThan(
      computeExpenditure(low).stabilizers,
    );
  });

  it('이전지출 비중이 큰 항목은 GDP 항등식의 정부지출에 일부만 들어간다', () => {
    // Arrange
    const total = totalBudgetRatio(budget);

    // Act
    const direct = directPurchaseRatio(budget);

    // Assert
    expect(direct).toBeLessThan(total);
    expect(direct).toBeGreaterThan(0);
  });

  it('재정적자가 이어지면 부채가 늘어난다', () => {
    // Arrange
    const debt = 1000;

    // Act
    const next = updateDebt({ debt, balance: -200, inflation: 0, oneOff: 0 });

    // Assert
    expect(next).toBeGreaterThan(debt);
    expect(next).toBeCloseTo(1050, 6);
  });

  it('흑자를 내면 부채가 줄어든다', () => {
    // Arrange & Act
    const next = updateDebt({ debt: 1000, balance: 200, inflation: 0, oneOff: 0 });

    // Assert
    expect(next).toBeLessThan(1000);
  });

  it('물가상승은 실질 부채 부담을 낮춘다', () => {
    // Arrange & Act
    const noInflation = updateDebt({ debt: 1000, balance: 0, inflation: 0, oneOff: 0 });
    const withInflation = updateDebt({ debt: 1000, balance: 0, inflation: 8, oneOff: 0 });

    // Assert
    expect(withInflation).toBeLessThan(noInflation);
  });

  it('부채는 음수가 되지 않는다', () => {
    // Arrange & Act
    const next = updateDebt({ debt: 10, balance: 100_000, inflation: 0, oneOff: 0 });

    // Assert
    expect(next).toBe(0);
  });

  it('부채가 많을수록 조달금리가 높아진다', () => {
    // Arrange
    const low = { policyRate: 3, debtToGdp: 40, stability: 70 };
    const high = { policyRate: 3, debtToGdp: 220, stability: 70 };

    // Act & Assert
    expect(computeInterestRate(high)).toBeGreaterThan(computeInterestRate(low));
  });

  it('GDP 가 0 이어도 부채비율 계산이 깨지지 않는다', () => {
    // Arrange & Act
    const ratio = debtToGdpRatio(1000, 0);

    // Assert
    expect(Number.isFinite(ratio)).toBe(true);
    expect(ratio).toBe(0);
  });
});
