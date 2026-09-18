import type { BudgetAllocation, MilitaryState } from '@/types';
import { MILITARY } from '@/config/military';
import { approach, clamp, logScale, safe } from '../math';

export interface PowerInput {
  troops: number;
  techLevel: number;
  readiness: number;
  /** 국방예산 절대규모(10억 USD, 연율). */
  defenseBudget: number;
}

/** 종합 군사력 지수. 병력·기술·준비도·예산 규모의 결합. */
export function computePower(input: PowerInput): number {
  const p = MILITARY.power;
  const troopScore = Math.sqrt(Math.max(safe(input.troops), 0) / p.troopReference) * 100;
  const budgetScore = Math.max(logScale(safe(input.defenseBudget), p.budgetReference) * 40 + 60, 0);

  return Math.max(
    troopScore * p.troopWeight +
      clamp(input.techLevel, 0, 100) * p.techWeight +
      clamp(input.readiness, 0, 100) * p.readinessWeight +
      budgetScore * p.budgetWeight,
    1,
  );
}

export interface MilitaryStepInput {
  current: MilitaryState;
  budget: BudgetAllocation;
  gdp: number;
  population: number;
  productivity: number;
  atWar: boolean;
  readinessModifier: number;
  techCalibration: number;
  troopCalibration: number;
}

export function stepMilitary(input: MilitaryStepInput): MilitaryState {
  const { current, budget } = input;

  // 병력 1백만 명당 요구되는 국방예산 대비 실제 예산으로 준비도가 결정된다.
  const requiredBudget =
    (Math.max(safe(current.troops), 0) / 1_000_000) * MILITARY.readiness.requiredPerMillionTroops;
  const coverage = requiredBudget <= 0 ? 1.4 : safe(budget.defense) / requiredBudget;
  const readinessTarget = clamp(coverage * 70, MILITARY.readiness.min, MILITARY.readiness.max);
  const readiness = clamp(
    approach(current.readiness, readinessTarget, MILITARY.readiness.adjustSpeed) +
      safe(input.readinessModifier),
    MILITARY.readiness.min,
    MILITARY.readiness.max,
  );

  const techTarget = clamp(
    safe(budget.research) * MILITARY.tech.researchWeight +
      safe(budget.defense) * MILITARY.tech.defenseWeight +
      safe(input.productivity) * MILITARY.tech.productivityWeight +
      safe(input.techCalibration),
    MILITARY.tech.min,
    MILITARY.tech.max,
  );
  const techLevel = approach(current.techLevel, techTarget, MILITARY.tech.adjustSpeed);

  const troopTarget = Math.max(
    (safe(input.population) / 1_000_000) *
      safe(budget.defense) *
      MILITARY.troops.perBudgetPointPerMillionPopulation +
      safe(input.troopCalibration),
    0,
  );
  const troops = Math.max(approach(current.troops, troopTarget, MILITARY.troops.adjustSpeed), 0);

  const warExhaustion = clamp(
    input.atWar
      ? current.warExhaustion + MILITARY.war.exhaustionPerTurn
      : current.warExhaustion - MILITARY.war.exhaustionPerTurn * 0.6,
    0,
    100,
  );

  return {
    troops,
    techLevel,
    readiness,
    warExhaustion,
    power: computePower({
      troops,
      techLevel,
      readiness,
      defenseBudget: Math.max(safe(input.gdp), 0) * (safe(budget.defense) / 100),
    }),
  };
}
