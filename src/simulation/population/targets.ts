import type { BudgetAllocation } from '@/types';
import { POPULATION } from '@/config/population';
import { clamp, logScale, safe } from '../math';

export interface FertilityTargetInput {
  budget: BudgetAllocation;
  unemployment: number;
  inflation: number;
  elderlyShare: number;
}

/**
 * 합계출산율 목표.
 * 복지·의료가 올리고, 실업·고물가·고령화가 내린다.
 * 국가별 사회문화 차이는 calibration 상수항이 담당한다.
 */
export function fertilityTargetRaw(input: FertilityTargetInput): number {
  const t = POPULATION.fertilityTarget;
  const inflationPressure = Math.max(safe(input.inflation) - t.inflationThreshold, 0);
  const aging = Math.max(safe(input.elderlyShare) - t.agingThreshold, 0);

  return (
    safe(input.budget.welfare) * t.welfareWeight +
    safe(input.budget.healthcare) * t.healthcareWeight -
    safe(input.unemployment) * t.unemploymentWeight -
    inflationPressure * t.inflationWeight -
    aging * t.agingWeight
  );
}

export function fertilityTarget(input: FertilityTargetInput, calibration: number): number {
  const t = POPULATION.fertilityTarget;
  return clamp(fertilityTargetRaw(input) + safe(calibration), t.min, t.max);
}

export interface MortalityTargetInput {
  elderlyShare: number;
  lifeExpectancy: number;
}

export function mortalityTargetRaw(input: MortalityTargetInput): number {
  const t = POPULATION.mortalityTarget;
  const aging = Math.max(safe(input.elderlyShare) - t.agingThreshold, 0);

  return (
    t.base +
    aging * t.agingWeight -
    (safe(input.lifeExpectancy) - t.lifeExpectancyReference) * t.lifeExpectancyWeight
  );
}

export function mortalityTarget(input: MortalityTargetInput, calibration: number): number {
  const t = POPULATION.mortalityTarget;
  return clamp(mortalityTargetRaw(input) + safe(calibration), t.min, t.max);
}

export interface LifeExpectancyTargetInput {
  budget: BudgetAllocation;
  educationIndex: number;
  /** 1인당 GDP (천 USD). */
  gdpPerCapita: number;
}

export function lifeExpectancyTargetRaw(input: LifeExpectancyTargetInput): number {
  const t = POPULATION.lifeExpectancyTarget;
  return (
    t.base +
    safe(input.budget.healthcare) * t.healthcareWeight +
    safe(input.budget.environment) * t.environmentWeight +
    safe(input.educationIndex) * t.educationWeight +
    logScale(safe(input.gdpPerCapita), 10) * t.incomeWeight
  );
}

export function lifeExpectancyTarget(
  input: LifeExpectancyTargetInput,
  calibration: number,
): number {
  const t = POPULATION.lifeExpectancyTarget;
  return clamp(lifeExpectancyTargetRaw(input) + safe(calibration), t.min, t.max);
}

export interface MigrationTargetInput {
  budget: BudgetAllocation;
  unemployment: number;
  stability: number;
  gdpPerCapita: number;
}

export function migrationTargetRaw(input: MigrationTargetInput): number {
  const t = POPULATION.migrationTarget;
  return (
    logScale(safe(input.gdpPerCapita), 10) * t.incomeWeight -
    safe(input.unemployment) * t.unemploymentWeight +
    safe(input.stability) * t.stabilityWeight +
    safe(input.budget.welfare) * t.welfareWeight
  );
}

export function migrationTarget(input: MigrationTargetInput, calibration: number): number {
  const t = POPULATION.migrationTarget;
  return clamp(migrationTargetRaw(input) + safe(calibration), t.min, t.max);
}

export interface EducationTargetInput {
  budget: BudgetAllocation;
  gdpPerCapita: number;
}

export function educationTargetRaw(input: EducationTargetInput): number {
  const t = POPULATION.educationTarget;
  return (
    t.base +
    safe(input.budget.education) * t.budgetWeight +
    logScale(safe(input.gdpPerCapita), 10) * t.incomeWeight
  );
}

export function educationTarget(input: EducationTargetInput, calibration: number): number {
  const t = POPULATION.educationTarget;
  return clamp(educationTargetRaw(input) + safe(calibration), t.min, t.max);
}

export interface AgeStructureTarget {
  elderlyShare: number;
  workingAgeShare: number;
}

export function ageStructureTarget(lifeExpectancy: number, fertility: number): AgeStructureTarget {
  const a = POPULATION.ageStructure;
  const elderly = clamp(
    a.elderlyBase +
      Math.max(safe(lifeExpectancy) - a.lifeExpectancyReference, 0) * a.lifeExpectancyWeight +
      Math.max(a.lowFertilityReference - safe(fertility), 0) * a.lowFertilityWeight,
    3,
    45,
  );
  const youth = clamp(a.youthBase + safe(fertility) * a.youthWeight, 5, 45);
  return { elderlyShare: elderly, workingAgeShare: clamp(100 - elderly - youth, 35, 80) };
}
