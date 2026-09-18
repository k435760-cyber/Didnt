import { describe, expect, it } from 'vitest';
import { crudeBirthRate, fertilityTarget, stepPopulation } from '@/simulation/population';
import { COUNTRIES } from '@/config/countries';
import type { PopulationState } from '@/types';

const current: PopulationState = {
  total: 51_200_000,
  fertilityRate: 0.75,
  mortalityRate: 6.6,
  lifeExpectancy: 83.5,
  workingAgeShare: 70,
  elderlyShare: 19.5,
  migrationRate: 0.6,
  educationIndex: 82,
};

const budget = COUNTRIES.KOR.budget;

const input = {
  current,
  fertility: { budget, unemployment: 3, inflation: 2.3, elderlyShare: 19.5 },
  mortality: { elderlyShare: 19.5, lifeExpectancy: 83.5 },
  lifeExpectancy: { budget, educationIndex: 82, gdpPerCapita: 38 },
  migration: { budget, unemployment: 3, stability: 68, gdpPerCapita: 38 },
  education: { budget, gdpPerCapita: 38 },
  calibration: { fertility: 0, mortality: 0, lifeExpectancy: 0, migration: 0, education: 0 },
  modifiers: { fertility: 0, migration: 0 },
};

describe('인구', () => {
  it('인구는 음수가 되지 않는다', () => {
    // Arrange
    const dying = {
      ...input,
      current: {
        ...current,
        total: 200_000,
        mortalityRate: 500,
        fertilityRate: 0,
        migrationRate: -50,
      },
    };

    // Act
    let state = dying;
    for (let i = 0; i < 40; i += 1) {
      const result = stepPopulation(state);
      state = { ...state, current: result.next };
    }

    // Assert
    expect(state.current.total).toBeGreaterThan(0);
  });

  it('모든 인구 지표가 유한값을 유지한다', () => {
    // Arrange
    const broken = {
      ...input,
      current: { ...current, total: Number.NaN, fertilityRate: Number.POSITIVE_INFINITY },
    };

    // Act
    const result = stepPopulation(broken);

    // Assert
    for (const value of Object.values(result.next)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('복지·의료 예산을 늘리면 출산율 목표가 올라간다', () => {
    // Arrange — calibration 은 국가별 사회문화 상수. 하한(0.4)에 눌리지 않도록 실제 범위 값을 쓴다.
    const generous = { ...budget, welfare: budget.welfare + 6, healthcare: budget.healthcare + 3 };
    const calibration = 1;

    // Act
    const baseline = fertilityTarget(
      { budget, unemployment: 3, inflation: 2, elderlyShare: 19 },
      calibration,
    );
    const expanded = fertilityTarget(
      { budget: generous, unemployment: 3, inflation: 2, elderlyShare: 19 },
      calibration,
    );

    // Assert
    expect(expanded).toBeGreaterThan(baseline);
  });

  it('실업률이 높으면 출산율 목표가 내려간다', () => {
    // Arrange & Act
    const low = fertilityTarget({ budget, unemployment: 3, inflation: 2, elderlyShare: 19 }, 1);
    const high = fertilityTarget({ budget, unemployment: 14, inflation: 2, elderlyShare: 19 }, 1);

    // Assert
    expect(high).toBeLessThan(low);
  });

  it('출산율이 낮으면 조출생률도 낮다', () => {
    // Arrange & Act
    const low = crudeBirthRate(0.7, 70);
    const high = crudeBirthRate(2.1, 70);

    // Assert
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('출생과 사망이 균형을 이루지 못하면 인구가 줄어든다', () => {
    // Arrange (출산율 0.75, 사망률 6.6 → 자연감소)
    // Act
    const result = stepPopulation(input);

    // Assert
    expect(result.flow.births).toBeLessThan(result.flow.deaths);
    expect(result.next.total).toBeLessThan(current.total + result.flow.netMigration);
  });

  it('인구 구조 비율의 합이 100을 넘지 않는다', () => {
    // Act
    const result = stepPopulation(input);
    const youth = 100 - result.next.workingAgeShare - result.next.elderlyShare;

    // Assert
    expect(result.next.workingAgeShare + result.next.elderlyShare).toBeLessThanOrEqual(100);
    expect(youth).toBeGreaterThanOrEqual(0);
  });
});
