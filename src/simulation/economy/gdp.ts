import type { BudgetAllocation, TaxPolicy } from '@/types';
import { ECONOMY } from '@/config/economy';
import { GROWTH_MAX, GROWTH_MIN, MIN_GDP } from '@/config/constants';
import { annualRateToQuarterFactor, clamp, safe } from '../math';

/** 성장률 기여도 분해. UI 와 뉴스에서 "왜 이렇게 됐는지" 설명하는 데 쓴다. */
export interface GrowthContributions {
  tax: number;
  fiscal: number;
  monetary: number;
  inflation: number;
  confidence: number;
  labourMarket: number;
  competitiveness: number;
  trade: number;
  war: number;
  events: number;
  calibration: number;
}

export interface DemandImpulseInput {
  tax: TaxPolicy;
  spendingRatio: number;
  previousSpendingRatio: number;
  policyRate: number;
  inflation: number;
  unemployment: number;
  structuralUnemployment: number;
  stability: number;
  approval: number;
  competitiveness: number;
  tradeBalanceRatio: number;
  previousTradeBalanceRatio: number;
  /** 전쟁으로 인한 성장률 손실(%p, 양수). */
  warPenalty: number;
  modifier: number;
  calibration: number;
}

export function computeDemandImpulse(input: DemandImpulseInput): GrowthContributions {
  const e = ECONOMY;
  const realRate = safe(input.policyRate) - safe(input.inflation);

  const tax =
    -(safe(input.tax.income) - e.referenceTax.income) * e.taxDrag.income -
    (safe(input.tax.corporate) - e.referenceTax.corporate) * e.taxDrag.corporate -
    (safe(input.tax.consumption) - e.referenceTax.consumption) * e.taxDrag.consumption;

  const spendingDelta = safe(input.spendingRatio) - safe(input.previousSpendingRatio);
  const fiscal =
    spendingDelta * e.fiscalMultiplier -
    Math.max(safe(input.spendingRatio) - e.neutralSpendingRatio, 0) * e.crowdingOut;

  const monetary = -(realRate - e.neutralRealRate) * e.realRateDrag;

  const inflationGap = Math.max(
    Math.abs(safe(input.inflation) - e.inflationModel.anchor) - e.inflationTolerance,
    0,
  );
  const inflation = -inflationGap * e.inflationDrag;

  const confidence =
    (safe(input.stability) - e.stabilityReference) * e.stabilityBoost +
    (safe(input.approval) - e.approvalReference) * e.approvalBoost;

  const labourMarket =
    -Math.max(safe(input.unemployment) - safe(input.structuralUnemployment), 0) *
    e.unemploymentDrag;

  const competitiveness =
    (safe(input.competitiveness) - e.competitivenessReference) * e.competitivenessBoost;

  const trade =
    (safe(input.tradeBalanceRatio) - safe(input.previousTradeBalanceRatio)) * e.tradeMultiplier;

  return {
    tax,
    fiscal,
    monetary,
    inflation,
    confidence,
    labourMarket,
    competitiveness,
    trade,
    war: -Math.max(safe(input.warPenalty), 0),
    events: safe(input.modifier),
    calibration: safe(input.calibration),
  };
}

export function totalImpulse(contributions: GrowthContributions): number {
  return (
    contributions.tax +
    contributions.fiscal +
    contributions.monetary +
    contributions.inflation +
    contributions.confidence +
    contributions.labourMarket +
    contributions.competitiveness +
    contributions.trade +
    contributions.war +
    contributions.events +
    contributions.calibration
  );
}

export interface PotentialGrowthInput {
  /** 연율 생산성 증가율(%). */
  productivityGrowth: number;
  /** 연율 노동력 증가율(%). */
  labourForceGrowth: number;
}

export function computePotentialGrowth(input: PotentialGrowthInput): number {
  return clamp(
    safe(input.productivityGrowth) + safe(input.labourForceGrowth),
    GROWTH_MIN,
    GROWTH_MAX,
  );
}

/** 잠재성장률 + 수요충격, 그리고 전분기 성장률의 관성. */
export function computeGrowth(
  potentialGrowth: number,
  impulse: number,
  previousGrowth: number,
): number {
  const raw = safe(potentialGrowth) + safe(impulse);
  const momentum = ECONOMY.growthMomentum;
  const smoothed = raw * (1 - momentum) + safe(previousGrowth) * momentum;
  return clamp(smoothed, GROWTH_MIN, GROWTH_MAX);
}

export function applyGrowth(gdp: number, annualGrowthPercent: number): number {
  const next = Math.max(safe(gdp), MIN_GDP) * annualRateToQuarterFactor(annualGrowthPercent);
  return Math.max(next, MIN_GDP);
}

export interface PropensityInput {
  tax: TaxPolicy;
  budget: BudgetAllocation;
  unemployment: number;
  structuralUnemployment: number;
  policyRate: number;
  inflation: number;
  stability: number;
}

export interface Propensities {
  consumption: number;
  investment: number;
}

/**
 * 소비·투자 성향. 두 값의 비율만 의미가 있으며,
 * GDP 항등식(C + I + G + NX = Y)을 유지하기 위해 잔여분을 이 비율로 나눈다.
 */
export function computePropensities(
  input: PropensityInput,
  calibration: { consumption: number; investment: number },
): Propensities {
  const p = ECONOMY.propensity;
  const realRate = safe(input.policyRate) - safe(input.inflation);
  const rateGap = realRate - ECONOMY.neutralRealRate;

  const consumption =
    p.consumptionBase +
    (ECONOMY.referenceTax.income - safe(input.tax.income)) * p.incomeTaxOnConsumption +
    (ECONOMY.referenceTax.consumption - safe(input.tax.consumption)) *
      p.consumptionTaxOnConsumption +
    safe(input.budget.welfare) * p.welfareOnConsumption -
    Math.max(safe(input.unemployment) - safe(input.structuralUnemployment), 0) *
      p.unemploymentOnConsumption -
    rateGap * p.realRateOnConsumption +
    safe(calibration.consumption);

  const investment =
    p.investmentBase -
    (safe(input.tax.corporate) - ECONOMY.referenceTax.corporate) * p.corporateTaxOnInvestment -
    rateGap * p.realRateOnInvestment +
    safe(input.budget.research) * p.researchOnInvestment +
    (safe(input.stability) - ECONOMY.stabilityReference) * p.stabilityOnInvestment -
    Math.max(safe(input.budget.defense) - p.defenseCrowdingThreshold, 0) * p.defenseCrowdingWeight +
    safe(calibration.investment);

  return {
    consumption: Math.max(consumption, 5),
    investment: Math.max(investment, 3),
  };
}

export interface DemandSplit {
  consumption: number;
  investment: number;
}

/** 잔여 수요(GDP - 정부지출 - 순수출)를 소비/투자로 배분한다. */
export function splitDemand(
  gdp: number,
  governmentSpending: number,
  netExports: number,
  propensities: Propensities,
): DemandSplit {
  const remainder = Math.max(safe(gdp) - safe(governmentSpending) - safe(netExports), 0);
  const weight = propensities.consumption + propensities.investment;
  if (weight <= 0) return { consumption: remainder, investment: 0 };

  const consumption = (remainder * propensities.consumption) / weight;
  return { consumption, investment: remainder - consumption };
}
