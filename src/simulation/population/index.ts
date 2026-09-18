import type { PopulationFlow, PopulationState } from '@/types';
import { POPULATION } from '@/config/population';
import { MIN_POPULATION } from '@/config/constants';
import { approach, clamp, quarterChangeToAnnualPercent, safe } from '../math';
import {
  ageStructureTarget,
  educationTarget,
  fertilityTarget,
  lifeExpectancyTarget,
  migrationTarget,
  mortalityTarget,
  type EducationTargetInput,
  type FertilityTargetInput,
  type LifeExpectancyTargetInput,
  type MigrationTargetInput,
  type MortalityTargetInput,
} from './targets';

export * from './targets';

export interface PopulationStepInput {
  current: PopulationState;
  fertility: FertilityTargetInput;
  mortality: MortalityTargetInput;
  lifeExpectancy: LifeExpectancyTargetInput;
  migration: MigrationTargetInput;
  education: EducationTargetInput;
  calibration: {
    fertility: number;
    mortality: number;
    lifeExpectancy: number;
    migration: number;
    education: number;
  };
  modifiers: {
    fertility: number;
    migration: number;
  };
}

export interface PopulationStepResult {
  next: PopulationState;
  flow: PopulationFlow;
  /** 노동가능인구 증가율(연율 %). 잠재성장률 계산에 쓴다. */
  labourForceGrowth: number;
}

/** 조출생률(인구 1,000명당, 연간). */
export function crudeBirthRate(fertility: number, workingAgeShare: number): number {
  return Math.max(
    safe(fertility) * (clamp(workingAgeShare, 0, 100) / 100) * POPULATION.birthRateFactor,
    0,
  );
}

export function stepPopulation(input: PopulationStepInput): PopulationStepResult {
  const { current, calibration, modifiers } = input;
  const speed = POPULATION.adjustSpeed;

  const fertility = clamp(
    approach(
      current.fertilityRate,
      fertilityTarget(input.fertility, calibration.fertility) + safe(modifiers.fertility),
      speed.fertility,
    ),
    POPULATION.fertilityTarget.min,
    POPULATION.fertilityTarget.max,
  );

  const lifeExpectancy = approach(
    current.lifeExpectancy,
    lifeExpectancyTarget(input.lifeExpectancy, calibration.lifeExpectancy),
    speed.lifeExpectancy,
  );

  const mortality = approach(
    current.mortalityRate,
    mortalityTarget({ elderlyShare: current.elderlyShare, lifeExpectancy }, calibration.mortality),
    speed.mortality,
  );

  const migrationRate = clamp(
    approach(
      current.migrationRate,
      migrationTarget(input.migration, calibration.migration) + safe(modifiers.migration),
      speed.migration,
    ),
    POPULATION.migrationTarget.min,
    POPULATION.migrationTarget.max,
  );

  const educationIndex = clamp(
    approach(
      current.educationIndex,
      educationTarget(input.education, calibration.education),
      speed.education,
    ),
    0,
    100,
  );

  const previousTotal = Math.max(safe(current.total), MIN_POPULATION);
  const births = (previousTotal * crudeBirthRate(fertility, current.workingAgeShare)) / 1000 / 4;
  const deaths = (previousTotal * Math.max(mortality, 0)) / 1000 / 4;
  const netMigration = (previousTotal * migrationRate) / 1000 / 4;

  const total = Math.max(previousTotal + births - deaths + netMigration, MIN_POPULATION);

  const structure = ageStructureTarget(lifeExpectancy, fertility);
  const elderlyShare = clamp(
    approach(current.elderlyShare, structure.elderlyShare, speed.ageStructure),
    0,
    60,
  );
  const workingAgeShare = clamp(
    approach(current.workingAgeShare, structure.workingAgeShare, speed.ageStructure),
    30,
    85,
  );

  const previousLabourForce = previousTotal * (current.workingAgeShare / 100);
  const labourForce = total * (workingAgeShare / 100);

  const next: PopulationState = {
    total,
    fertilityRate: fertility,
    mortalityRate: mortality,
    lifeExpectancy,
    workingAgeShare,
    elderlyShare,
    migrationRate,
    educationIndex,
  };

  return {
    next,
    flow: { births, deaths, netMigration },
    labourForceGrowth: quarterChangeToAnnualPercent(previousLabourForce, labourForce),
  };
}
