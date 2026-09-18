import type { BudgetAllocation } from '@/types';
import { ECONOMY } from '@/config/economy';
import { UNEMPLOYMENT_MAX, UNEMPLOYMENT_MIN } from '@/config/constants';
import { clamp, safe } from '../math';

export interface StructuralInput {
  educationIndex: number;
  competitiveness: number;
  budget: BudgetAllocation;
  elderlyShare: number;
}

/**
 * 구조적(자연) 실업률.
 * 교육·경쟁력·R&D 가 낮추고, 후한 복지와 고령화가 높인다.
 */
export function structuralUnemploymentRaw(input: StructuralInput): number {
  const s = ECONOMY.unemploymentModel.structural;
  return (
    s.base +
    (s.educationReference - safe(input.educationIndex)) * s.educationWeight +
    (s.competitivenessReference - safe(input.competitiveness)) * s.competitivenessWeight +
    safe(input.budget.welfare) * s.welfareWeight -
    safe(input.budget.research) * s.researchWeight +
    Math.max(safe(input.elderlyShare) - 15, 0) * s.agingWeight
  );
}

export function structuralUnemployment(input: StructuralInput, calibration: number): number {
  return clamp(
    structuralUnemploymentRaw(input) + safe(calibration),
    UNEMPLOYMENT_MIN,
    UNEMPLOYMENT_MAX,
  );
}

export interface UnemploymentInput {
  previous: number;
  growth: number;
  potentialGrowth: number;
  structural: number;
  modifier: number;
}

/** 오쿤의 법칙 + 구조적 실업률로의 수렴. */
export function computeUnemployment(input: UnemploymentInput): number {
  const model = ECONOMY.unemploymentModel;
  const gap = safe(input.growth) - safe(input.potentialGrowth);
  const okunEffect = -model.okun * gap;
  const drift = (safe(input.structural) - safe(input.previous)) * model.driftSpeed;

  return clamp(
    safe(input.previous) + okunEffect + drift + safe(input.modifier),
    UNEMPLOYMENT_MIN,
    UNEMPLOYMENT_MAX,
  );
}
