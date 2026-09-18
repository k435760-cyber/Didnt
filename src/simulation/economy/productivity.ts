import type { BudgetAllocation } from '@/types';
import { ECONOMY } from '@/config/economy';
import { approach, clamp, safe } from '../math';

export interface ProductivityTargetInput {
  educationIndex: number;
  budget: BudgetAllocation;
  competitiveness: number;
  elderlyShare: number;
}

/**
 * 생산성 지수의 장기 목표치.
 * 교육지수·R&D·인프라·경쟁력이 끌어올리고, 고령화가 끌어내린다.
 * 현재값과의 갭이 그대로 잠재성장률이 되므로, 교육 투자는 즉시가 아니라
 * "갭을 넓혀 수 년에 걸쳐 따라잡는" 방식으로 성장에 기여한다.
 */
export function productivityTarget(input: ProductivityTargetInput, calibration: number): number {
  const t = ECONOMY.productivityTarget;
  const aging = Math.max(safe(input.elderlyShare) - t.agingThreshold, 0);

  return (
    safe(input.educationIndex) * t.educationWeight +
    safe(input.budget.research) * t.researchWeight +
    safe(input.budget.infrastructure) * t.infrastructureWeight +
    safe(input.competitiveness) * t.competitivenessWeight -
    aging * t.agingWeight +
    safe(calibration)
  );
}

export function stepProductivity(current: number, target: number, modifier: number): number {
  const moved = approach(current, target, ECONOMY.productivityAdjustSpeed);
  return clamp(moved + safe(modifier), 5, 1000);
}

export interface CompetitivenessTargetInput {
  budget: BudgetAllocation;
  educationIndex: number;
  corporateTax: number;
}

export function competitivenessTargetRaw(input: CompetitivenessTargetInput): number {
  const t = ECONOMY.competitivenessTarget;
  return (
    safe(input.budget.research) * t.researchWeight +
    safe(input.budget.industry) * t.industryWeight +
    safe(input.budget.infrastructure) * t.infrastructureWeight +
    safe(input.educationIndex) * t.educationWeight -
    safe(input.corporateTax) * t.corporateTaxWeight
  );
}

export function competitivenessTarget(
  input: CompetitivenessTargetInput,
  calibration: number,
): number {
  return clamp(competitivenessTargetRaw(input) + safe(calibration), 0, 100);
}

export function stepCompetitiveness(current: number, target: number, modifier: number): number {
  const moved = approach(current, target, ECONOMY.competitivenessAdjustSpeed);
  return clamp(moved + safe(modifier), 0, 100);
}
