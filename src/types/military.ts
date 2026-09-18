import type { CountryId } from './country';

export interface MilitaryState {
  /** 종합 군사력 지수. 병력·기술·준비도·예산의 결과값. */
  power: number;
  /** 병력(명). */
  troops: number;
  /** 군사 기술 수준 0~100. */
  techLevel: number;
  /** 준비도 0~100. 예산이 부족하면 하락한다. */
  readiness: number;
  /** 전쟁 피로도 0~100. */
  warExhaustion: number;
}

export interface War {
  attacker: CountryId;
  defender: CountryId;
  /** 전쟁이 시작된 턴. */
  startedTurn: number;
  /** -100(공격측 우세) ~ 100(방어측 우세) 사이의 전선 상황. */
  frontline: number;
  /** 누적 전비(10억 USD). */
  cost: number;
}

export interface BattleOutcome {
  attackerScore: number;
  defenderScore: number;
  /** 이번 분기 전선 변동치. */
  shift: number;
  concluded: boolean;
  winner: CountryId | null;
}
