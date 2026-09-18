import type { CountryId } from './country';

export type RelationStatus = 'hostile' | 'tense' | 'neutral' | 'friendly' | 'allied';

export type DiplomaticActionType =
  'trade_agreement' | 'aid' | 'sanction' | 'alliance' | 'summit' | 'threaten';

export interface DiplomaticAction {
  type: DiplomaticActionType;
  actor: CountryId;
  target: CountryId;
}

export interface Treaty {
  kind: 'trade' | 'alliance';
  a: CountryId;
  b: CountryId;
  since: number;
}

export interface Sanction {
  by: CountryId;
  on: CountryId;
  since: number;
}

/** 'KOR:USA' 형태의 정규화된 키 → -100~100 관계도. */
export type RelationMatrix = Record<string, number>;
