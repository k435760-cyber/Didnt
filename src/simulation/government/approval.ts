import type { ApprovalBreakdown, BudgetAllocation, TaxPolicy } from '@/types';
import { POLITICS } from '@/config/politics';
import { TURNS_PER_YEAR } from '@/config/constants';
import { approach, clamp, clampPercent, limit, safe } from '../math';

export interface ApprovalInput {
  current: number;
  growth: number;
  unemployment: number;
  structuralUnemployment: number;
  inflation: number;
  tax: TaxPolicy;
  budget: BudgetAllocation;
  debtToGdp: number;
  activeWars: number;
  warExhaustion: number;
  quartersInOffice: number;
  eventModifier: number;
  calibration: number;
}

export interface ApprovalResult {
  approval: number;
  breakdown: ApprovalBreakdown;
  /** clamp 을 적용하기 전의 목표 지지율. calibration 역산에 쓴다. */
  rawTarget: number;
}

/**
 * 국민 지지율.
 *
 * 1) 각 요인의 기여도를 개별 clamp 로 제한해 한 가지 지표만으로 지지율이 폭주하지 않게 하고
 * 2) 목표 지지율을 계산한 뒤 smoothing 으로 접근시켜 분기 간 급변을 막는다.
 */
export function computeApproval(input: ApprovalInput): ApprovalResult {
  const a = POLITICS.approval;

  const growth = limit((safe(input.growth) - a.growth.reference) * a.growth.weight, a.growth.clamp);

  const unemploymentGap = safe(input.unemployment) - safe(input.structuralUnemployment);
  const unemployment = limit(-unemploymentGap * a.unemployment.weight, a.unemployment.clamp);

  const inflationGap = Math.max(
    Math.abs(safe(input.inflation) - a.inflation.target) - a.inflation.tolerance,
    0,
  );
  const inflation = limit(-inflationGap * a.inflation.weight, a.inflation.clamp);

  const taxBurden =
    safe(input.tax.income) + safe(input.tax.corporate) * 0.4 + safe(input.tax.consumption) * 0.8;
  const tax = limit(-(taxBurden - a.tax.reference) * a.tax.weight, a.tax.clamp);

  const welfare = limit(
    safe(input.budget.welfare) * a.welfare.weight +
      safe(input.budget.healthcare) * a.healthcare.weight,
    a.welfare.clamp + a.healthcare.clamp,
  );

  const security = limit(safe(input.budget.security) * a.security.weight, a.security.clamp);

  const debt = limit(
    -Math.max(safe(input.debtToGdp) - a.debt.threshold, 0) * a.debt.weight,
    a.debt.clamp,
  );

  const war = limit(
    -(safe(input.activeWars) * a.war.perWar + safe(input.warExhaustion) * a.war.exhaustionWeight),
    a.war.clamp,
  );

  const incumbency = limit(
    -(safe(input.quartersInOffice) / TURNS_PER_YEAR) * a.incumbencyPerYear,
    a.incumbencyClamp,
  );

  const events = safe(input.eventModifier);

  // clamp 이전 값도 유지한다. calibration 역산이 상한에 걸려 빗나가는 것을 막기 위함이다.
  const rawTarget =
    a.base +
    growth +
    unemployment +
    inflation +
    tax +
    welfare +
    security +
    debt +
    war +
    incumbency +
    events +
    safe(input.calibration);
  const target = clampPercent(rawTarget);

  return {
    approval: clampPercent(approach(safe(input.current), target, a.smoothing)),
    rawTarget,
    breakdown: {
      growth,
      unemployment,
      inflation,
      tax,
      welfare,
      security,
      debt,
      war,
      incumbency,
      events,
      target,
    },
  };
}

export interface StabilityInput {
  current: number;
  approval: number;
  budget: BudgetAllocation;
  unemployment: number;
  inflation: number;
  activeWars: number;
  eventModifier: number;
  calibration: number;
}

/** 정치 안정성의 목표치. calibration 역산에도 쓰이므로 별도 함수로 분리한다. */
export function stabilityTargetRaw(input: Omit<StabilityInput, 'current' | 'calibration'>): number {
  const s = POLITICS.stability;
  const inflationGap = Math.max(Math.abs(safe(input.inflation) - 2) - s.inflationTolerance, 0);

  return (
    s.base +
    safe(input.approval) * s.approvalWeight +
    safe(input.budget.security) * s.securityWeight +
    safe(input.budget.welfare) * s.welfareWeight -
    safe(input.unemployment) * s.unemploymentWeight -
    inflationGap * s.inflationWeight -
    safe(input.activeWars) * s.warWeight +
    safe(input.eventModifier)
  );
}

export function stabilityTarget(input: Omit<StabilityInput, 'current'>): number {
  return clampPercent(stabilityTargetRaw(input) + safe(input.calibration));
}

export function computeStability(input: StabilityInput): number {
  return clamp(
    approach(safe(input.current), stabilityTarget(input), POLITICS.stability.smoothing),
    0,
    100,
  );
}
