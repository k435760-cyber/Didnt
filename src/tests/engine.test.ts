import { describe, expect, it } from 'vitest';
import { createGame } from '@/simulation/state/createGame';
import { advanceTurn, canAdvanceTurn, resolvePendingEvent } from '@/simulation/engine';
import { findEvent } from '@/simulation/events/catalog';
import { applyPolicy } from '@/simulation/government/policy';
import { COUNTRY_IDS } from '@/types/country';
import type { CountryId, GameState, PolicyState } from '@/types';

function play(
  turns: number,
  options: { seed?: string; country?: CountryId; policy?: (p: PolicyState) => PolicyState } = {},
): GameState {
  let state = createGame({
    playerCountry: options.country ?? 'KOR',
    seed: options.seed ?? 'TEST-SEED',
  });

  for (let i = 0; i < turns; i += 1) {
    if (state.pendingEvent) {
      const event = findEvent(state.pendingEvent.eventId);
      state = resolvePendingEvent(state, event?.choices?.[0]?.id ?? '');
    }
    if (state.gameOver) break;

    if (options.policy) {
      const nation = state.nations[state.playerCountry];
      state = {
        ...state,
        nations: {
          ...state.nations,
          [state.playerCountry]: {
            ...nation,
            policy: applyPolicy(nation.lastAppliedPolicy, options.policy(nation.policy)),
          },
        },
      };
    }

    state = advanceTurn(state).state;
  }

  return state;
}

function fingerprint(state: GameState): string {
  const nation = state.nations[state.playerCountry];
  return [
    nation.economy.gdp.toFixed(8),
    nation.economy.inflation.toFixed(8),
    nation.politics.approval.toFixed(8),
    nation.population.total.toFixed(4),
    state.eventHistory.map((e) => `${e.turn}:${e.eventId}:${e.choiceId ?? '-'}`).join(','),
    state.news.map((n) => n.headline).join('|'),
  ].join('#');
}

describe('시뮬레이션 엔진', () => {
  it('같은 seed 와 같은 조작이면 결과가 완전히 동일하다', () => {
    // Arrange & Act
    const first = play(30, { seed: 'DETERMINISM' });
    const second = play(30, { seed: 'DETERMINISM' });

    // Assert
    expect(fingerprint(first)).toBe(fingerprint(second));
  });

  it('seed 가 다르면 진행 결과가 달라진다', () => {
    // Arrange & Act
    const a = play(30, { seed: 'ALPHA' });
    const b = play(30, { seed: 'BRAVO' });

    // Assert
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it('랜덤 이벤트도 seed 에 따라 결정적으로 발생한다', () => {
    // Arrange & Act
    const a = play(60, { seed: 'EVENTS' }).eventHistory.map((e) => `${e.turn}:${e.eventId}`);
    const b = play(60, { seed: 'EVENTS' }).eventHistory.map((e) => `${e.turn}:${e.eventId}`);

    // Assert
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('모든 국가에서 60분기 동안 지표가 유한값을 유지한다', () => {
    for (const country of COUNTRY_IDS) {
      // Arrange & Act
      const state = play(60, { country, seed: 'SANITY' });
      const nation = state.nations[country];

      // Assert
      expect(Number.isFinite(nation.economy.gdp), `${country} GDP`).toBe(true);
      expect(nation.economy.gdp).toBeGreaterThan(0);
      expect(Number.isFinite(nation.economy.inflation)).toBe(true);
      expect(nation.population.total).toBeGreaterThan(0);
      expect(nation.politics.approval).toBeGreaterThanOrEqual(0);
      expect(nation.politics.approval).toBeLessThanOrEqual(100);
      expect(nation.fiscal.debt).toBeGreaterThanOrEqual(0);
    }
  });

  it('모든 국가의 모든 분기 기록에서 지지율이 0~100 을 벗어나지 않는다', () => {
    for (const country of COUNTRY_IDS) {
      // Arrange & Act
      const state = play(40, { country, seed: 'BOUNDS' });

      // Assert
      for (const point of state.history) {
        expect(point.approval, `${country} turn ${point.turn}`).toBeGreaterThanOrEqual(0);
        expect(point.approval).toBeLessThanOrEqual(100);
        expect(Number.isFinite(point.gdp)).toBe(true);
      }
    }
  });

  it('선택이 필요한 이벤트가 뜨면 턴을 넘길 수 없다', () => {
    // Arrange
    let state = createGame({ playerCountry: 'KOR', seed: 'PENDING-CHECK' });
    let guarded = false;

    // Act
    for (let i = 0; i < 80 && !guarded; i += 1) {
      if (state.pendingEvent) {
        guarded = true;
        break;
      }
      state = advanceTurn(state).state;
    }

    // Assert
    expect(guarded).toBe(true);
    expect(canAdvanceTurn(state)).toBe(false);
    expect(() => advanceTurn(state)).toThrow();
  });

  it('이벤트 선택을 처리하면 다시 진행할 수 있다', () => {
    // Arrange
    let state = createGame({ playerCountry: 'KOR', seed: 'PENDING-CHECK' });
    while (!state.pendingEvent) state = advanceTurn(state).state;
    const event = findEvent(state.pendingEvent.eventId);

    // Act
    state = resolvePendingEvent(state, event?.choices?.[0]?.id ?? '');

    // Assert
    expect(state.pendingEvent).toBeNull();
    expect(canAdvanceTurn(state)).toBe(true);
    expect(state.eventHistory.at(-1)?.eventId).toBe(event?.id);
  });

  it('turn 이 진행되면 기록이 한 분기씩 쌓인다', () => {
    // Arrange & Act
    const state = play(12, { seed: 'HISTORY' });

    // Assert
    expect(state.turn).toBe(12);
    expect(state.history).toHaveLength(13);
    expect(state.history.at(-1)?.turn).toBe(12);
  });

  it('세율을 크게 올리면 세입 비중이 올라가고 부채 비율이 낮아진다', () => {
    // Arrange & Act
    const baseline = play(28, { seed: 'TAXES' });
    const taxed = play(28, {
      seed: 'TAXES',
      policy: (policy) => ({ ...policy, tax: { ...policy.tax, income: 40, consumption: 18 } }),
    });

    // Assert
    const baseNation = baseline.nations.KOR;
    const taxedNation = taxed.nations.KOR;
    const baseRatio = baseNation.fiscal.revenue / baseNation.economy.gdp;
    const taxedRatio = taxedNation.fiscal.revenue / taxedNation.economy.gdp;

    expect(taxedRatio).toBeGreaterThan(baseRatio);
    expect(taxedNation.fiscal.debtToGdp).toBeLessThan(baseNation.fiscal.debtToGdp);
  });

  it('정부 지출을 늘리면 국가부채가 더 빨리 늘어난다', () => {
    // Arrange & Act
    const baseline = play(28, { seed: 'SPENDING' });
    const spender = play(28, {
      seed: 'SPENDING',
      policy: (policy) => ({
        ...policy,
        budget: { ...policy.budget, welfare: policy.budget.welfare + 6 },
      }),
    });

    // Assert
    expect(spender.nations.KOR.fiscal.debtToGdp).toBeGreaterThan(
      baseline.nations.KOR.fiscal.debtToGdp,
    );
  });

  it('교육 투자는 즉시가 아니라 장기간에 걸쳐 생산성을 끌어올린다', () => {
    // Arrange
    const raise = (policy: PolicyState): PolicyState => ({
      ...policy,
      budget: { ...policy.budget, education: 9 },
    });

    // Act
    const shortRun = play(4, { seed: 'EDU', policy: raise });
    const shortBase = play(4, { seed: 'EDU' });
    const longRun = play(60, { seed: 'EDU', policy: raise });
    const longBase = play(60, { seed: 'EDU' });

    // Assert — 1년 뒤에는 거의 차이가 없고, 15년 뒤에는 뚜렷하게 벌어진다.
    const shortGap =
      shortRun.nations.KOR.economy.productivity - shortBase.nations.KOR.economy.productivity;
    const longGap =
      longRun.nations.KOR.economy.productivity - longBase.nations.KOR.economy.productivity;

    expect(shortGap).toBeLessThan(0.6);
    expect(longGap).toBeGreaterThan(shortGap * 4);
    expect(longRun.nations.KOR.population.educationIndex).toBeGreaterThan(
      longBase.nations.KOR.population.educationIndex + 5,
    );
  });

  it('게임 시작 직후에는 성장률이 잠재성장률과 거의 같다', () => {
    for (const country of COUNTRY_IDS) {
      // Arrange
      const state = createGame({ playerCountry: country, seed: 'CALIBRATION' });

      // Act
      const next = advanceTurn(state).state.nations[country];

      // Assert — calibration 이 초기 수요충격과 중립금리를 모두 0 으로 맞춘다.
      expect(
        Math.abs(next.economy.gdpGrowth - state.nations[country].economy.potentialGrowth),
        country,
      ).toBeLessThan(0.05);
    }
  });

  it('게임 시작 직후 중앙은행이 금리를 흔들지 않는다', () => {
    for (const country of COUNTRY_IDS) {
      // Arrange
      const state = createGame({ playerCountry: country, seed: 'NEUTRAL-RATE' });
      const before = state.nations[country].policy.policyRate;

      // Act
      const after = advanceTurn(state).state.nations[country].economy.policyRate;

      // Assert
      expect(Math.abs(after - before), country).toBeLessThan(0.05);
    }
  });
});
