import type { BattleOutcome, CountryId, War } from '@/types';
import { MILITARY } from '@/config/military';
import { clamp, logScale, safe } from '../math';

export interface CombatantInput {
  id: CountryId;
  power: number;
  techLevel: number;
  gdp: number;
  defenseBudgetRatio: number;
  warExhaustion: number;
  /** 동맹국의 군사력 합계. */
  allyPower: number;
}

/**
 * 전투력 = 군사력 × 기술 보정 × 경제력 보정 × (1 - 피로도) + 동맹 지원.
 * 군사력 지수 하나만으로 결정되지 않도록 경제·예산·동맹·피로도를 모두 반영한다.
 */
export function combatStrength(input: CombatantInput): number {
  const w = MILITARY.war;
  const techFactor = 0.6 + clamp(input.techLevel, 0, 100) / 125;
  const economyFactor = 1 + logScale(Math.max(safe(input.gdp), 1), 3000) * w.economyWeight;
  const budgetFactor = 0.75 + clamp(safe(input.defenseBudgetRatio), 0, 15) * 0.09;
  const exhaustionFactor = 1 - (clamp(input.warExhaustion, 0, 100) / 100) * w.exhaustionPenalty;

  const own =
    Math.max(safe(input.power), 1) *
    techFactor *
    Math.max(economyFactor, 0.4) *
    budgetFactor *
    Math.max(exhaustionFactor, 0.2);

  return Math.max(own + Math.max(safe(input.allyPower), 0) * w.allyContribution, 1);
}

export interface BattleInput {
  war: War;
  attacker: CombatantInput;
  defender: CombatantInput;
  /** 결정적 승부를 가르는 난수 [0, 1). */
  roll: number;
}

export function resolveBattle(input: BattleInput): BattleOutcome {
  const attackerScore = combatStrength(input.attacker);
  const defenderScore = combatStrength(input.defender);
  const total = attackerScore + defenderScore;

  // 전력 우위 비율을 -1~1 로 정규화하고, 난수로 ±20% 의 전장 불확실성을 준다.
  const advantage = (attackerScore - defenderScore) / total;
  const noise = (input.roll - 0.5) * 0.4;
  const shift = (advantage + noise) * MILITARY.war.frontlineScale;

  const frontline = clamp(safe(input.war.frontline) + shift, -120, 120);
  const concluded = Math.abs(frontline) >= MILITARY.war.decisiveThreshold;

  let winner: CountryId | null = null;
  if (concluded) winner = frontline > 0 ? input.attacker.id : input.defender.id;

  return { attackerScore, defenderScore, shift, concluded, winner };
}

/** 분기당 전비(10억 USD). */
export function warCost(gdp: number): number {
  return Math.max(safe(gdp), 0) * (MILITARY.war.costShareOfGdp / 100);
}
