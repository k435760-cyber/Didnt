import { ECONOMY } from '@/config/economy';
import { INFLATION_MAX, INFLATION_MIN } from '@/config/constants';
import { clamp, safe } from '../math';

export interface InflationInput {
  previous: number;
  unemployment: number;
  structuralUnemployment: number;
  growth: number;
  potentialGrowth: number;
  policyRate: number;
  /** 이번 턴 소비세 변화폭(%p). 인상 시 물가에 전가된다. */
  consumptionTaxDelta: number;
  energyDependence: number;
  /** 이벤트로 인한 에너지 가격 충격(지수). */
  energyShock: number;
  modifier: number;
  calibration: number;
}

export function computeInflationRaw(input: Omit<InflationInput, 'calibration'>): number {
  const m = ECONOMY.inflationModel;

  const expected = m.persistence * safe(input.previous) + (1 - m.persistence) * m.anchor;
  const phillips = (safe(input.structuralUnemployment) - safe(input.unemployment)) * m.phillips;
  const demandPull = (safe(input.growth) - safe(input.potentialGrowth)) * m.demandPull;

  const neutralNominal = expected + ECONOMY.neutralRealRate;
  const monetary = -(safe(input.policyRate) - neutralNominal) * m.monetary;

  const taxPush = Math.max(safe(input.consumptionTaxDelta), 0) * m.consumptionTaxPassThrough;
  const energy =
    safe(input.energyShock) * (safe(input.energyDependence) / 100) * m.energyPassThrough;

  return expected + phillips + demandPull + monetary + taxPush + energy + safe(input.modifier);
}

export function computeInflation(input: InflationInput): number {
  return clamp(computeInflationRaw(input) + safe(input.calibration), INFLATION_MIN, INFLATION_MAX);
}
