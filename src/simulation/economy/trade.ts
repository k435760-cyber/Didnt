import type { TradeResult } from '@/types';
import { ECONOMY } from '@/config/economy';
import { clamp, safe } from '../math';

export interface ExportShareInput {
  competitiveness: number;
  inflation: number;
  /** 체결 중인 무역협정 수. */
  tradeTreaties: number;
  /** 자국에 부과된 제재 수. */
  sanctionsAgainst: number;
  /** 이벤트 효과(GDP 대비 %p). */
  modifier: number;
}

/** clamp 이전의 원시값. calibration 역산은 반드시 이 값을 기준으로 해야 한다. */
export function exportShareRaw(input: ExportShareInput): number {
  const t = ECONOMY.trade;
  return (
    (safe(input.competitiveness) - t.competitivenessReference) * t.competitivenessWeight -
    (safe(input.inflation) - t.inflationReference) * t.inflationWeight +
    safe(input.tradeTreaties) * t.treatyBonus -
    safe(input.sanctionsAgainst) * t.sanctionPenalty +
    safe(input.modifier)
  );
}

export function exportShare(input: ExportShareInput, calibration: number): number {
  return clamp(exportShareRaw(input) + safe(calibration), 1, 120);
}

export interface ImportShareInput {
  /** 내수 성장률(%). 수입 수요를 끌어올린다. */
  domesticDemandGrowth: number;
  energyDependence: number;
  energyShock: number;
  modifier: number;
}

export function importShareRaw(input: ImportShareInput): number {
  const t = ECONOMY.trade;
  return (
    safe(input.domesticDemandGrowth) * t.domesticDemandWeight +
    safe(input.energyShock) * (safe(input.energyDependence) / 100) * t.energyWeight * 10 +
    safe(input.modifier)
  );
}

export function importShare(input: ImportShareInput, calibration: number): number {
  return clamp(importShareRaw(input) + safe(calibration), 1, 120);
}

export function computeTrade(gdp: number, exportRatio: number, importRatio: number): TradeResult {
  const base = Math.max(safe(gdp), 0);
  const exports = base * (safe(exportRatio) / 100);
  const imports = base * (safe(importRatio) / 100);
  return { exports, imports, balance: exports - imports };
}
