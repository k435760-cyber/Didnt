import type { CountryId, CountryProfile, RelationMatrix, RelationStatus } from '@/types';
import { DIPLOMACY } from '@/config/diplomacy';
import { RELATION_MAX, RELATION_MIN } from '@/config/constants';
import { approach, clamp, safe } from '../math';

/** 순서에 무관한 정규화 키. 'CHN:KOR' 처럼 항상 사전순으로 만든다. */
export function relationKey(a: CountryId, b: CountryId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function getRelation(matrix: RelationMatrix, a: CountryId, b: CountryId): number {
  if (a === b) return RELATION_MAX;
  return clamp(safe(matrix[relationKey(a, b)]), RELATION_MIN, RELATION_MAX);
}

export function withRelation(
  matrix: RelationMatrix,
  a: CountryId,
  b: CountryId,
  value: number,
): RelationMatrix {
  if (a === b) return matrix;
  return { ...matrix, [relationKey(a, b)]: clamp(value, RELATION_MIN, RELATION_MAX) };
}

export function adjustRelation(
  matrix: RelationMatrix,
  a: CountryId,
  b: CountryId,
  delta: number,
): RelationMatrix {
  return withRelation(matrix, a, b, getRelation(matrix, a, b) + safe(delta));
}

export function relationStatus(value: number): RelationStatus {
  for (const threshold of DIPLOMACY.thresholds) {
    if (value >= threshold.min) return threshold.status;
  }
  return 'hostile';
}

/** 성향·지역 블록으로 결정되는 관계도 기준선. 매 턴 이 값으로 서서히 회귀한다. */
export function baselineRelation(a: CountryProfile, b: CountryProfile): number {
  const bias = DIPLOMACY.personalityBias[a.personality] + DIPLOMACY.personalityBias[b.personality];
  const blocBonus = a.bloc === b.bloc ? DIPLOMACY.sameBlocBonus : 0;
  return clamp(bias + blocBonus, RELATION_MIN, RELATION_MAX);
}

export interface DriftInput {
  matrix: RelationMatrix;
  profiles: readonly CountryProfile[];
  /** 국가별 군사력 지수. 격차가 크면 긴장이 커진다. */
  power: Record<CountryId, number>;
  /** 동맹/무역협정으로 묶인 쌍. 기준선이 높아진다. */
  treatyBonus: Record<string, number>;
}

export function driftRelations(input: DriftInput): RelationMatrix {
  let matrix = input.matrix;

  for (let i = 0; i < input.profiles.length; i += 1) {
    for (let j = i + 1; j < input.profiles.length; j += 1) {
      const a = input.profiles[i];
      const b = input.profiles[j];
      if (!a || !b) continue;

      const key = relationKey(a.id, b.id);
      const powerA = safe(input.power[a.id], 1);
      const powerB = safe(input.power[b.id], 1);
      const gap = Math.abs(powerA - powerB) / Math.max(powerA + powerB, 1);
      const tension = gap * DIPLOMACY.powerGapWeight;

      const baseline = baselineRelation(a, b) - tension + safe(input.treatyBonus[key]);
      const current = getRelation(matrix, a.id, b.id);
      matrix = withRelation(matrix, a.id, b.id, approach(current, baseline, DIPLOMACY.driftSpeed));
    }
  }

  return matrix;
}
