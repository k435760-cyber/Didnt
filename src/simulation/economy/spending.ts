import type { BudgetAllocation, BudgetCategory, ExpenditureBreakdown } from '@/types';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import { DIRECT_PURCHASE_SHARE } from '@/config/countries';
import { FISCAL } from '@/config/fiscal';
import { safe } from '../math';

export interface ExpenditureInput {
  gdp: number;
  budget: BudgetAllocation;
  unemployment: number;
  debt: number;
  interestRate: number;
  /** 이벤트로 인한 추가 지출(GDP 대비 %). */
  modifierSpending: number;
}

/** 예산 항목 비율 합계(GDP 대비 %). */
export function totalBudgetRatio(budget: BudgetAllocation): number {
  let total = 0;
  for (const category of BUDGET_CATEGORIES) {
    total += safe(budget[category]);
  }
  return total;
}

/**
 * GDP 항등식에 들어가는 정부지출(G).
 * 이전지출(복지·산업보조 등)은 가계·기업 소비로 흡수되므로 제외한다.
 */
export function directPurchaseRatio(budget: BudgetAllocation): number {
  let total = 0;
  for (const category of BUDGET_CATEGORIES) {
    total += safe(budget[category]) * DIRECT_PURCHASE_SHARE[category];
  }
  return total;
}

export function computeExpenditure(input: ExpenditureInput): ExpenditureBreakdown {
  const gdp = Math.max(safe(input.gdp), 0);

  const programs = {} as Record<BudgetCategory, number>;
  for (const category of BUDGET_CATEGORIES) {
    programs[category] = gdp * (safe(input.budget[category]) / 100);
  }

  const excessUnemployment = Math.max(
    safe(input.unemployment) - FISCAL.stabilizer.unemploymentThreshold,
    0,
  );
  const welfareCoupling = 1 + safe(input.budget.welfare) * FISCAL.stabilizer.welfareCoupling * 0.1;
  const stabilizers = gdp * excessUnemployment * FISCAL.stabilizer.weightPerPoint * welfareCoupling;

  const interest = Math.max(safe(input.debt), 0) * (safe(input.interestRate) / 100);
  const eventSpending = gdp * (safe(input.modifierSpending) / 100);

  let total = stabilizers + interest + eventSpending;
  for (const category of BUDGET_CATEGORIES) {
    total += programs[category];
  }

  return { programs, stabilizers, interest, total: Math.max(total, 0) };
}
