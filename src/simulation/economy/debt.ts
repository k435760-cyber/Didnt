import { FISCAL } from '@/config/fiscal';
import { clamp, safe } from '../math';

export interface InterestRateInput {
  policyRate: number;
  debtToGdp: number;
  stability: number;
}

/** 국채 조달금리. 부채가 많고 정치가 불안할수록 높다. */
export function computeInterestRate(input: InterestRateInput): number {
  const { interest } = FISCAL;
  const base = safe(input.policyRate) * interest.policyRatePassThrough + interest.baseSpread;
  const riskPremium =
    Math.max(safe(input.debtToGdp) - interest.riskThreshold, 0) * interest.riskWeight;
  const stabilityPremium =
    Math.max(interest.stabilityReference - safe(input.stability), 0) * interest.stabilityWeight;
  return clamp(base + riskPremium + stabilityPremium, 0, interest.max);
}

export interface DebtInput {
  debt: number;
  /** 연율 재정수지(10억 USD). 음수면 적자. */
  balance: number;
  /** 연율 물가상승률(%). 실질 부채 부담을 낮춘다. */
  inflation: number;
  /** 이벤트·전쟁 등으로 발생한 일회성 부채 증감(10억 USD). */
  oneOff: number;
}

/**
 * 부채 잔액 갱신.
 * 이 게임의 금액은 모두 실질(불변가격) 기준이므로, 물가상승은 실질 부채를 줄인다.
 */
export function updateDebt(input: DebtInput): number {
  const quarterlyFlow = safe(input.balance) / 4;
  const nominal = safe(input.debt) - quarterlyFlow + safe(input.oneOff);
  const deflator = 1 + clamp(safe(input.inflation), -20, 60) / 100 / 4;
  return Math.max(nominal / deflator, 0);
}

export function debtToGdpRatio(debt: number, gdp: number): number {
  if (gdp <= 0) return 0;
  return clamp((safe(debt) / gdp) * 100, 0, 2000);
}
