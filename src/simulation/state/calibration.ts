import type { Calibration } from '@/types';
import type { InitialCountryData } from '@/config/countries';
import { ECONOMY } from '@/config/economy';
import { FISCAL } from '@/config/fiscal';
import { POPULATION } from '@/config/population';
import { MILITARY } from '@/config/military';
import { INITIAL_TREATIES } from '@/config/diplomacy';
import { safe } from '../math';
import { computeRevenue } from '../economy/tax';
import { computeExpenditure, directPurchaseRatio, totalBudgetRatio } from '../economy/spending';
import { computeInterestRate } from '../economy/debt';
import { competitivenessTargetRaw, productivityTarget } from '../economy/productivity';
import { structuralUnemploymentRaw } from '../economy/unemployment';
import { computeInflationRaw } from '../economy/inflation';
import { taylorRate } from '../economy/monetary';
import { computeDemandImpulse, computePropensities, totalImpulse } from '../economy/gdp';
import { exportShareRaw, importShareRaw } from '../economy/trade';
import {
  ageStructureTarget,
  crudeBirthRate,
  educationTargetRaw,
  fertilityTargetRaw,
  lifeExpectancyTargetRaw,
  migrationTargetRaw,
  mortalityTargetRaw,
} from '../population';
import { computeApproval, stabilityTargetRaw } from '../government/approval';

/**
 * 국가별 구조 상수를 역산한다.
 *
 * 각 목표치 함수는 `f(정책·상태) + offset` 형태이므로
 * `offset = 초기값 - f(초기 정책·상태)` 로 두면 초기 상태가 곧 균형점이 된다.
 * 예외는 생산성으로, 초기 추세성장률을 만들어 낼 만큼의 갭을 일부러 남긴다.
 */
export function calibrate(data: InitialCountryData): Calibration {
  const budget = data.budget;
  const gdpPerCapitaThousand = (data.gdp * 1_000_000_000) / data.population / 1000;

  const education =
    data.educationIndex - educationTargetRaw({ budget, gdpPerCapita: gdpPerCapitaThousand });

  const lifeExpectancy =
    data.lifeExpectancy -
    lifeExpectancyTargetRaw({
      budget,
      educationIndex: data.educationIndex,
      gdpPerCapita: gdpPerCapitaThousand,
    });

  const fertility =
    data.fertilityRate -
    fertilityTargetRaw({
      budget,
      unemployment: data.unemployment,
      inflation: data.inflation,
      elderlyShare: data.elderlyShare,
    });

  const mortality =
    data.mortalityRate -
    mortalityTargetRaw({ elderlyShare: data.elderlyShare, lifeExpectancy: data.lifeExpectancy });

  const migration =
    data.migrationRate -
    migrationTargetRaw({
      budget,
      unemployment: data.unemployment,
      stability: data.stability,
      gdpPerCapita: gdpPerCapitaThousand,
    });

  const competitiveness =
    data.competitiveness -
    competitivenessTargetRaw({
      budget,
      educationIndex: data.educationIndex,
      corporateTax: data.tax.corporate,
    });

  // 인구 자연증가율(연율 %)을 근사해 생산성이 감당해야 할 성장률을 구한다.
  const naturalRatePerThousand =
    crudeBirthRate(data.fertilityRate, data.workingAgeShare) -
    data.mortalityRate +
    data.migrationRate;
  const labourGrowth = naturalRatePerThousand / 10;
  const requiredProductivityGrowth = data.trendGrowth - labourGrowth;

  // 생산성 증가율(연율) = 갭 × 조정속도 × 4 / 현재 생산성 × 100
  const desiredGap =
    (requiredProductivityGrowth * data.productivity) / (400 * ECONOMY.productivityAdjustSpeed);

  const productivity =
    data.productivity +
    desiredGap -
    productivityTarget(
      {
        educationIndex: data.educationIndex,
        budget,
        competitiveness: data.competitiveness,
        elderlyShare: data.elderlyShare,
      },
      0,
    );

  const unemployment =
    data.unemployment -
    structuralUnemploymentRaw({
      educationIndex: data.educationIndex,
      competitiveness: data.competitiveness,
      budget,
      elderlyShare: data.elderlyShare,
    });

  const inflation =
    data.inflation -
    computeInflationRaw({
      previous: data.inflation,
      unemployment: data.unemployment,
      structuralUnemployment: data.unemployment,
      growth: data.trendGrowth,
      potentialGrowth: data.trendGrowth,
      policyRate: data.policyRate,
      consumptionTaxDelta: 0,
      energyDependence: data.energyDependence,
      energyShock: 0,
      modifier: 0,
    });

  const rawPropensities = computePropensities(
    {
      tax: data.tax,
      budget,
      unemployment: data.unemployment,
      structuralUnemployment: data.unemployment,
      policyRate: data.policyRate,
      inflation: data.inflation,
      stability: data.stability,
    },
    { consumption: 0, investment: 0 },
  );

  // 게임 시작 시점에 이미 맺어져 있는 무역협정은 수출 비율 공식에 들어가므로,
  // calibration 도 같은 조건에서 역산해야 초기 무역수지가 흔들리지 않는다.
  const initialTradeTreaties = INITIAL_TREATIES.filter(
    (treaty) => treaty.kind === 'trade' && (treaty.a === data.id || treaty.b === data.id),
  ).length;

  const exportCal =
    data.exportShare -
    exportShareRaw({
      competitiveness: data.competitiveness,
      inflation: data.inflation,
      tradeTreaties: initialTradeTreaties,
      sanctionsAgainst: 0,
      modifier: 0,
    });

  const importCal =
    data.importShare -
    importShareRaw({
      domesticDemandGrowth: data.trendGrowth,
      energyDependence: data.energyDependence,
      energyShock: 0,
      modifier: 0,
    });

  // 초기 상태에서 수요충격 합계가 0 이 되도록 보정한다.
  // 이렇게 해야 게임 시작 직후 성장률이 잠재성장률과 일치하고,
  // 이후의 성장률 변동이 온전히 '플레이어의 정책 변화'로만 설명된다.
  const spendingRatio = totalBudgetRatio(budget);
  const growth = -totalImpulse(
    computeDemandImpulse({
      tax: data.tax,
      spendingRatio,
      previousSpendingRatio: spendingRatio,
      policyRate: data.policyRate,
      inflation: data.inflation,
      unemployment: data.unemployment,
      structuralUnemployment: data.unemployment,
      stability: data.stability,
      approval: data.approval,
      competitiveness: data.competitiveness,
      tradeBalanceRatio: data.exportShare - data.importShare,
      previousTradeBalanceRatio: data.exportShare - data.importShare,
      warPenalty: 0,
      modifier: 0,
      calibration: 0,
    }),
  );

  const taylor =
    data.policyRate -
    taylorRate({
      inflation: data.inflation,
      growth: data.trendGrowth,
      potentialGrowth: data.trendGrowth,
    });

  const approvalProbe = computeApproval({
    current: data.approval,
    growth: data.trendGrowth,
    unemployment: data.unemployment,
    structuralUnemployment: data.unemployment,
    inflation: data.inflation,
    tax: data.tax,
    budget,
    debtToGdp: data.debtToGdp,
    activeWars: 0,
    warExhaustion: 0,
    quartersInOffice: 0,
    eventModifier: 0,
    calibration: 0,
  });
  const approval = data.approval - approvalProbe.rawTarget;

  const stability =
    data.stability -
    stabilityTargetRaw({
      approval: data.approval,
      budget,
      unemployment: data.unemployment,
      inflation: data.inflation,
      activeWars: 0,
      eventModifier: 0,
    });

  const militaryTech =
    data.militaryTech -
    (safe(budget.research) * MILITARY.tech.researchWeight +
      safe(budget.defense) * MILITARY.tech.defenseWeight +
      data.productivity * MILITARY.tech.productivityWeight);

  const troops =
    data.troops -
    (data.population / 1_000_000) *
      budget.defense *
      MILITARY.troops.perBudgetPointPerMillionPopulation;

  // 초기 재정수지가 목표치가 되도록 세외수입을 보정한다.
  const interestRate = computeInterestRate({
    policyRate: data.policyRate,
    debtToGdp: data.debtToGdp,
    stability: data.stability,
  });
  const expenditure = computeExpenditure({
    gdp: data.gdp,
    budget,
    unemployment: data.unemployment,
    debt: (data.debtToGdp / 100) * data.gdp,
    interestRate,
    modifierSpending: 0,
  });
  const rawRevenue = computeRevenue({
    gdp: data.gdp,
    consumption: data.gdp * (data.consumptionShare / 100),
    tax: data.tax,
    revenueCalibration: 0,
    modifierRevenue: 0,
  });
  const targetRevenue = expenditure.total + data.gdp * (data.fiscalBalanceRatio / 100);
  const revenue = ((targetRevenue - rawRevenue.total) / data.gdp) * 100;

  return {
    productivity,
    competitiveness,
    growth,
    inflation,
    unemployment,
    fertility,
    mortality,
    lifeExpectancy,
    migration,
    education,
    exportShare: exportCal,
    importShare: importCal,
    revenue,
    taylor,
    approval,
    stability,
    propensityConsumption: data.consumptionShare - rawPropensities.consumption,
    propensityInvestment: data.investmentShare - rawPropensities.investment,
    militaryTech,
    troops,
  };
}

/** 초기 상태의 인구 구조가 목표와 크게 어긋나지 않는지 확인하는 보조 함수. */
export function initialAgeStructure(data: InitialCountryData): {
  elderlyShare: number;
  workingAgeShare: number;
} {
  return ageStructureTarget(data.lifeExpectancy, data.fertilityRate);
}

/** 초기 정부지출(GDP 항등식용) 비율. */
export function initialGovernmentRatio(data: InitialCountryData): number {
  return directPurchaseRatio(data.budget);
}

export const CALIBRATION_REFERENCES = {
  lafferCurvature: FISCAL.lafferCurvature,
  birthRateFactor: POPULATION.birthRateFactor,
} as const;
