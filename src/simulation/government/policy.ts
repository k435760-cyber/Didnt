import type { BudgetAllocation, PolicyState, TaxPolicy } from '@/types';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import { FISCAL } from '@/config/fiscal';
import { POLICY_RATE_MAX, POLICY_RATE_MIN } from '@/config/constants';
import { clamp, round, safe } from '../math';

/** 세율을 허용 범위로 자른다. */
export function clampTax(tax: TaxPolicy): TaxPolicy {
  const limits = FISCAL.taxLimits;
  return {
    income: clamp(tax.income, limits.income.min, limits.income.max),
    corporate: clamp(tax.corporate, limits.corporate.min, limits.corporate.max),
    consumption: clamp(tax.consumption, limits.consumption.min, limits.consumption.max),
  };
}

export function clampBudget(budget: BudgetAllocation): BudgetAllocation {
  const limits = FISCAL.budgetLimits;
  const next = {} as BudgetAllocation;
  for (const category of BUDGET_CATEGORIES) {
    next[category] = round(clamp(safe(budget[category]), limits.min, limits.max), 2);
  }
  return next;
}

/** 분기당 변화폭 제한을 적용한다. 급격한 정책 조작으로 엔진을 흔드는 것을 막는다. */
function limitChange(current: number, requested: number, maxDelta: number): number {
  const delta = clamp(safe(requested) - safe(current), -maxDelta, maxDelta);
  return safe(current) + delta;
}

export function applyTaxChange(current: TaxPolicy, requested: TaxPolicy): TaxPolicy {
  const max = FISCAL.changeLimits.taxPerTurn;
  return clampTax({
    income: limitChange(current.income, requested.income, max),
    corporate: limitChange(current.corporate, requested.corporate, max),
    consumption: limitChange(current.consumption, requested.consumption, max),
  });
}

export function applyBudgetChange(
  current: BudgetAllocation,
  requested: BudgetAllocation,
): BudgetAllocation {
  const max = FISCAL.changeLimits.budgetPerTurn;
  const next = {} as BudgetAllocation;
  for (const category of BUDGET_CATEGORIES) {
    next[category] = limitChange(current[category], requested[category], max);
  }
  return clampBudget(next);
}

export function applyPolicyRateChange(current: number, requested: number): number {
  const next = limitChange(current, requested, FISCAL.changeLimits.policyRatePerTurn);
  return round(clamp(next, POLICY_RATE_MIN, POLICY_RATE_MAX), 2);
}

/** 플레이어/AI 가 요청한 정책을 한 번에 검증·적용한다. */
export function applyPolicy(current: PolicyState, requested: PolicyState): PolicyState {
  return {
    tax: applyTaxChange(current.tax, requested.tax),
    budget: applyBudgetChange(current.budget, requested.budget),
    policyRate: applyPolicyRateChange(current.policyRate, requested.policyRate),
    centralBankAuto: requested.centralBankAuto,
  };
}
