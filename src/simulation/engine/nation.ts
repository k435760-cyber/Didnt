import type { NationState } from '@/types';
import { MAX_HISTORY_POINTS } from '@/config/constants';
import { clamp, quarterChangeToAnnualPercent } from '../math';
import { modifierTotal, tickModifiers } from '../events/modifiers';
import { computeRevenue } from '../economy/tax';
import { computeExpenditure, directPurchaseRatio, totalBudgetRatio } from '../economy/spending';
import { computeInterestRate, debtToGdpRatio, updateDebt } from '../economy/debt';
import { structuralUnemployment, computeUnemployment } from '../economy/unemployment';
import { exportShare, importShare, computeTrade } from '../economy/trade';
import {
  applyGrowth,
  computeDemandImpulse,
  computeGrowth,
  computePotentialGrowth,
  computePropensities,
  splitDemand,
  totalImpulse,
  type GrowthContributions,
} from '../economy/gdp';
import { computeInflation } from '../economy/inflation';
import {
  competitivenessTarget,
  productivityTarget,
  stepCompetitiveness,
  stepProductivity,
} from '../economy/productivity';
import { stepPopulation } from '../population';
import { computeApproval, computeStability } from '../government/approval';
import { stepMilitary } from '../military/power';

export interface NationTurnContext {
  turn: number;
  /** 이 국가가 참여 중인 전쟁 수. */
  activeWars: number;
  tradeTreaties: number;
  sanctionsAgainst: number;
  /** 전쟁으로 인한 성장률 손실(%p). */
  warPenalty: number;
}

export interface NationTurnReport {
  contributions: GrowthContributions;
  structuralUnemployment: number;
  potentialGrowthNext: number;
  revenueRatio: number;
  expenditureRatio: number;
}

export interface NationTurnOutput {
  nation: NationState;
  report: NationTurnReport;
}

/**
 * 한 국가의 1분기 시뮬레이션.
 *
 * 계산 순서는 게임 규칙에 정의된 순서를 그대로 따른다.
 * 잠재성장률만은 직전 분기에 확정된 생산성·노동력 증가율을 쓴다(지표 공표 시차).
 */
export function simulateNation(before: NationState, ctx: NationTurnContext): NationTurnOutput {
  const { calibration: cal, policy, lastAppliedPolicy } = before;
  const mods = before.modifiers;
  const m = (field: Parameters<typeof modifierTotal>[1]): number => modifierTotal(mods, field);

  // 2) 세입
  const interestRate = computeInterestRate({
    policyRate: lastAppliedPolicy.policyRate,
    debtToGdp: before.fiscal.debtToGdp,
    stability: before.politics.stability,
  });
  const revenue = computeRevenue({
    gdp: before.economy.gdp,
    consumption: before.economy.consumption,
    tax: policy.tax,
    revenueCalibration: cal.revenue,
    modifierRevenue: m('revenue'),
  });

  // 3) 정부 지출
  const expenditure = computeExpenditure({
    gdp: before.economy.gdp,
    budget: policy.budget,
    unemployment: before.economy.unemployment,
    debt: before.fiscal.debt,
    interestRate,
    modifierSpending: m('spending'),
  });

  // 4) 재정수지
  const balance = revenue.total - expenditure.total;

  // 5) GDP 성장률
  const structural = structuralUnemployment(
    {
      educationIndex: before.population.educationIndex,
      competitiveness: before.economy.competitiveness,
      budget: policy.budget,
      elderlyShare: before.population.elderlyShare,
    },
    cal.unemployment,
  );

  const energyShock = m('energyCost');
  const exportRatio = exportShare(
    {
      competitiveness: before.economy.competitiveness,
      inflation: before.economy.inflation,
      tradeTreaties: ctx.tradeTreaties,
      sanctionsAgainst: ctx.sanctionsAgainst,
      modifier: m('exports'),
    },
    cal.exportShare,
  );
  const importRatio = importShare(
    {
      domesticDemandGrowth: before.economy.gdpGrowth,
      energyDependence: before.economy.energyDependence,
      energyShock,
      modifier: m('imports'),
    },
    cal.importShare,
  );

  const previousTradeRatio =
    ((before.economy.exports - before.economy.imports) / Math.max(before.economy.gdp, 1)) * 100;
  const tradeRatio = exportRatio - importRatio;

  const spendingRatio = totalBudgetRatio(policy.budget);
  const previousSpendingRatio = totalBudgetRatio(lastAppliedPolicy.budget);

  const contributions = computeDemandImpulse({
    tax: policy.tax,
    spendingRatio,
    previousSpendingRatio,
    policyRate: policy.policyRate,
    inflation: before.economy.inflation,
    unemployment: before.economy.unemployment,
    structuralUnemployment: structural,
    stability: before.politics.stability,
    approval: before.politics.approval,
    competitiveness: before.economy.competitiveness,
    tradeBalanceRatio: tradeRatio,
    previousTradeBalanceRatio: previousTradeRatio,
    warPenalty: ctx.warPenalty,
    modifier: m('gdpGrowth'),
    calibration: cal.growth,
  });

  const potentialGrowth = before.economy.potentialGrowth;
  const growth = computeGrowth(
    potentialGrowth,
    totalImpulse(contributions),
    before.economy.gdpGrowth,
  );
  const gdp = applyGrowth(before.economy.gdp, growth);

  const trade = computeTrade(gdp, exportRatio, importRatio);
  const governmentSpending = gdp * (directPurchaseRatio(policy.budget) / 100);
  const propensities = computePropensities(
    {
      tax: policy.tax,
      budget: policy.budget,
      unemployment: before.economy.unemployment,
      structuralUnemployment: structural,
      policyRate: policy.policyRate,
      inflation: before.economy.inflation,
      stability: before.politics.stability,
    },
    {
      consumption: cal.propensityConsumption + m('consumption'),
      investment: cal.propensityInvestment + m('investment'),
    },
  );
  const demand = splitDemand(gdp, governmentSpending, trade.balance, propensities);

  // 6) 물가
  const inflation = computeInflation({
    previous: before.economy.inflation,
    unemployment: before.economy.unemployment,
    structuralUnemployment: structural,
    growth,
    potentialGrowth,
    policyRate: policy.policyRate,
    consumptionTaxDelta: policy.tax.consumption - lastAppliedPolicy.tax.consumption,
    energyDependence: before.economy.energyDependence,
    energyShock,
    modifier: m('inflation'),
    calibration: cal.inflation,
  });

  // 7) 실업률
  const unemployment = computeUnemployment({
    previous: before.economy.unemployment,
    growth,
    potentialGrowth,
    structural,
    modifier: m('unemployment'),
  });

  // 8) 인구
  const gdpPerCapitaThousand = (gdp * 1_000_000_000) / Math.max(before.population.total, 1) / 1000;
  const populationStep = stepPopulation({
    current: before.population,
    fertility: {
      budget: policy.budget,
      unemployment,
      inflation,
      elderlyShare: before.population.elderlyShare,
    },
    mortality: {
      elderlyShare: before.population.elderlyShare,
      lifeExpectancy: before.population.lifeExpectancy,
    },
    lifeExpectancy: {
      budget: policy.budget,
      educationIndex: before.population.educationIndex,
      gdpPerCapita: gdpPerCapitaThousand,
    },
    migration: {
      budget: policy.budget,
      unemployment,
      stability: before.politics.stability,
      gdpPerCapita: gdpPerCapitaThousand,
    },
    education: { budget: policy.budget, gdpPerCapita: gdpPerCapitaThousand },
    calibration: {
      fertility: cal.fertility,
      mortality: cal.mortality,
      lifeExpectancy: cal.lifeExpectancy,
      migration: cal.migration,
      education: cal.education,
    },
    modifiers: { fertility: m('fertility'), migration: m('migration') },
  });

  // 9) 생산성
  const competitiveness = stepCompetitiveness(
    before.economy.competitiveness,
    competitivenessTarget(
      {
        budget: policy.budget,
        educationIndex: populationStep.next.educationIndex,
        corporateTax: policy.tax.corporate,
      },
      cal.competitiveness,
    ),
    m('competitiveness'),
  );
  const productivity = stepProductivity(
    before.economy.productivity,
    productivityTarget(
      {
        educationIndex: populationStep.next.educationIndex,
        budget: policy.budget,
        competitiveness,
        elderlyShare: populationStep.next.elderlyShare,
      },
      cal.productivity,
    ),
    m('productivity'),
  );
  const productivityGrowth = quarterChangeToAnnualPercent(
    before.economy.productivity,
    productivity,
  );

  // 10) 국가부채
  const debt = updateDebt({
    debt: before.fiscal.debt,
    balance,
    inflation,
    oneOff: m('debt'),
  });
  const debtToGdp = debtToGdpRatio(debt, gdp);

  // 11) 국민 지지율
  const approvalResult = computeApproval({
    current: before.politics.approval,
    growth,
    unemployment,
    structuralUnemployment: structural,
    inflation,
    tax: policy.tax,
    budget: policy.budget,
    debtToGdp,
    activeWars: ctx.activeWars,
    warExhaustion: before.military.warExhaustion,
    quartersInOffice: before.politics.quartersInOffice,
    eventModifier: m('approval'),
    calibration: cal.approval,
  });
  const stability = computeStability({
    current: before.politics.stability,
    approval: approvalResult.approval,
    budget: policy.budget,
    unemployment,
    inflation,
    activeWars: ctx.activeWars,
    eventModifier: m('stability'),
    calibration: cal.stability,
  });

  // 13) 군사 상태
  const military = stepMilitary({
    current: before.military,
    budget: policy.budget,
    gdp,
    population: populationStep.next.total,
    productivity,
    atWar: ctx.activeWars > 0,
    readinessModifier: m('militaryReadiness'),
    techCalibration: cal.militaryTech,
    troopCalibration: cal.troops,
  });

  const potentialGrowthNext = computePotentialGrowth({
    productivityGrowth,
    labourForceGrowth: populationStep.labourForceGrowth,
  });

  const nation: NationState = {
    ...before,
    economy: {
      gdp,
      gdpGrowth: growth,
      potentialGrowth: potentialGrowthNext,
      consumption: demand.consumption,
      investment: demand.investment,
      governmentSpending,
      exports: trade.exports,
      imports: trade.imports,
      inflation,
      unemployment,
      policyRate: policy.policyRate,
      productivity,
      competitiveness,
      energyDependence: clamp(before.economy.energyDependence, 0, 100),
      priceIndex: before.economy.priceIndex * (1 + inflation / 100 / 4),
    },
    fiscal: {
      revenue: revenue.total,
      expenditure: expenditure.total,
      balance,
      debt,
      debtToGdp,
      interestRate,
    },
    population: populationStep.next,
    politics: {
      approval: approvalResult.approval,
      stability,
      quartersInOffice: before.politics.quartersInOffice + 1,
    },
    military,
    lastAppliedPolicy: {
      tax: { ...policy.tax },
      budget: { ...policy.budget },
      policyRate: policy.policyRate,
      centralBankAuto: policy.centralBankAuto,
    },
    modifiers: tickModifiers(mods),
  };

  return {
    nation,
    report: {
      contributions,
      structuralUnemployment: structural,
      potentialGrowthNext,
      revenueRatio: (revenue.total / Math.max(gdp, 1)) * 100,
      expenditureRatio: (expenditure.total / Math.max(gdp, 1)) * 100,
    },
  };
}

export function trimHistory<T>(points: readonly T[]): T[] {
  if (points.length <= MAX_HISTORY_POINTS) return [...points];
  return points.slice(points.length - MAX_HISTORY_POINTS);
}
