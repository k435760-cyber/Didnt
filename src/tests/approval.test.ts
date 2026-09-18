import { describe, expect, it } from 'vitest';
import { computeApproval, computeStability } from '@/simulation/government/approval';
import { COUNTRIES } from '@/config/countries';

const base = {
  current: 50,
  growth: 2,
  unemployment: 4,
  structuralUnemployment: 4,
  inflation: 2,
  tax: COUNTRIES.KOR.tax,
  budget: COUNTRIES.KOR.budget,
  debtToGdp: 60,
  activeWars: 0,
  warExhaustion: 0,
  quartersInOffice: 0,
  eventModifier: 0,
  calibration: 0,
};

describe('국민 지지율', () => {
  it('물가가 크게 오르면 지지율이 떨어진다', () => {
    // Arrange
    const stable = { ...base };
    const inflationary = { ...base, inflation: 12 };

    // Act
    const stableResult = computeApproval(stable);
    const inflationResult = computeApproval(inflationary);

    // Assert
    expect(inflationResult.breakdown.inflation).toBeLessThan(0);
    expect(inflationResult.approval).toBeLessThan(stableResult.approval);
  });

  it('성장률이 높으면 지지율이 오른다', () => {
    // Arrange & Act
    const low = computeApproval({ ...base, growth: -2 });
    const high = computeApproval({ ...base, growth: 5 });

    // Assert
    expect(high.approval).toBeGreaterThan(low.approval);
  });

  it('실업률이 자연실업률을 크게 웃돌면 지지율이 떨어진다', () => {
    // Arrange & Act
    const balanced = computeApproval(base);
    const jobless = computeApproval({ ...base, unemployment: 12 });

    // Assert
    expect(jobless.approval).toBeLessThan(balanced.approval);
  });

  it('세율을 올리면 지지율에 마이너스로 작용한다', () => {
    // Arrange
    const heavier = { ...base, tax: { income: 45, corporate: 40, consumption: 25 } };

    // Act
    const light = computeApproval(base);
    const heavy = computeApproval(heavier);

    // Assert
    expect(heavy.breakdown.tax).toBeLessThan(light.breakdown.tax);
  });

  it('지지율은 항상 0~100 범위를 유지한다', () => {
    // Arrange
    const extremes = [
      {
        ...base,
        current: 0,
        growth: -50,
        inflation: 60,
        unemployment: 40,
        debtToGdp: 900,
        activeWars: 5,
      },
      {
        ...base,
        current: 100,
        growth: 50,
        inflation: 2,
        unemployment: 1,
        debtToGdp: 0,
        eventModifier: 500,
      },
      { ...base, current: Number.NaN, growth: Number.NaN, inflation: Number.NaN },
    ];

    // Act
    const results = extremes.map(computeApproval);

    // Assert
    for (const result of results) {
      expect(result.approval).toBeGreaterThanOrEqual(0);
      expect(result.approval).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.approval)).toBe(true);
    }
  });

  it('단일 요인 하나가 지지율을 한 번에 뒤집지 못한다 (smoothing)', () => {
    // Arrange
    const current = 60;

    // Act
    const crash = computeApproval({
      ...base,
      current,
      inflation: 40,
      growth: -15,
      unemployment: 30,
    });

    // Assert
    expect(crash.approval).toBeLessThan(current);
    expect(crash.approval).toBeGreaterThan(current - 25);
  });

  it('요인별 기여도는 개별 상한 안에서만 움직인다', () => {
    // Arrange & Act
    const extreme = computeApproval({ ...base, inflation: 80, growth: 40, unemployment: 39 });

    // Assert
    expect(Math.abs(extreme.breakdown.inflation)).toBeLessThanOrEqual(20);
    expect(Math.abs(extreme.breakdown.growth)).toBeLessThanOrEqual(16);
    expect(Math.abs(extreme.breakdown.unemployment)).toBeLessThanOrEqual(18);
  });

  it('전쟁은 안정성을 떨어뜨린다', () => {
    // Arrange
    const peace = {
      current: 70,
      approval: 50,
      budget: COUNTRIES.KOR.budget,
      unemployment: 4,
      inflation: 2,
      activeWars: 0,
      eventModifier: 0,
      calibration: 0,
    };

    // Act
    const atWar = computeStability({ ...peace, activeWars: 2 });
    const atPeace = computeStability(peace);

    // Assert
    expect(atWar).toBeLessThan(atPeace);
  });
});
