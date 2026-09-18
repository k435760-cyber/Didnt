import type { RevenueBreakdown, TaxPolicy } from '@/types';
import { FISCAL } from '@/config/fiscal';
import { clamp, safe } from '../math';

export interface RevenueInput {
  gdp: number;
  consumption: number;
  tax: TaxPolicy;
  /** GDP 대비 % 단위의 세외수입 보정. */
  revenueCalibration: number;
  /** 이벤트로 인한 세입 변동(GDP 대비 %). */
  modifierRevenue: number;
}

/**
 * 명목세율 → 실효 징수율.
 * 세율이 오를수록 회피·축소로 징수 효율이 떨어진다(래퍼 곡선의 단조 구간).
 */
export function effectiveRate(nominalPercent: number): number {
  const rate = clamp(nominalPercent, 0, 100) / 100;
  const efficiency = 1 - FISCAL.lafferCurvature * rate * rate;
  return clamp(rate * efficiency, 0, 1);
}

export function computeRevenue(input: RevenueInput): RevenueBreakdown {
  const gdp = Math.max(safe(input.gdp), 0);

  const income = gdp * FISCAL.base.labourShare * effectiveRate(input.tax.income);
  const corporate = gdp * FISCAL.base.profitShare * effectiveRate(input.tax.corporate);
  const consumption = Math.max(safe(input.consumption), 0) * effectiveRate(input.tax.consumption);

  const otherRatio =
    FISCAL.base.nonTaxRevenue +
    safe(input.revenueCalibration) / 100 +
    safe(input.modifierRevenue) / 100;
  const other = gdp * otherRatio;

  const total = Math.max(income + corporate + consumption + other, 0);
  return { income, corporate, consumption, other, total };
}
