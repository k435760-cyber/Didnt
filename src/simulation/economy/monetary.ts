import { ECONOMY } from '@/config/economy';
import { POLICY_RATE_MAX, POLICY_RATE_MIN } from '@/config/constants';
import { clamp, safe } from '../math';

export interface TaylorInput {
  inflation: number;
  growth: number;
  potentialGrowth: number;
}

/**
 * 테일러 준칙에 따른 적정 기준금리.
 * `offset` 은 국가별 중립금리 차이를 담는 calibration 값으로, 게임 시작 시점의
 * 기준금리가 준칙의 출력과 일치하도록 역산된다. 덕분에 게임을 시작하자마자
 * 중앙은행이 금리를 흔드는 일이 없다.
 */
export function taylorRate(input: TaylorInput, offset = 0): number {
  const t = ECONOMY.taylorRule;
  const inflation = safe(input.inflation);
  const gap = safe(input.growth) - safe(input.potentialGrowth);

  const rate =
    inflation +
    t.neutralNominalPremium +
    t.inflationWeight * (inflation - t.inflationTarget) +
    t.outputWeight * gap +
    safe(offset);

  return clamp(rate, POLICY_RATE_MIN, POLICY_RATE_MAX);
}

/** 목표 금리로 한 번에 점프하지 않도록 분기 조정폭을 제한한다. */
export function stepPolicyRate(current: number, desired: number): number {
  const max = ECONOMY.taylorRule.maxStep;
  const delta = clamp(safe(desired) - safe(current), -max, max);
  return clamp(safe(current) + delta, POLICY_RATE_MIN, POLICY_RATE_MAX);
}
