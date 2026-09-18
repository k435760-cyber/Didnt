import type { CountryId, GameState, NationState, War } from '@/types';
import { MILITARY } from '@/config/military';
import { clamp, safe } from '../math';
import { combatStrength, resolveBattle, warCost } from '../military/war';
import { alliesOf } from '../diplomacy/actions';
import { adjustRelation } from '../diplomacy/relations';
import { deriveRng } from '../rng';

export interface WarResolution {
  wars: War[];
  nations: Record<CountryId, NationState>;
  relations: GameState['relations'];
  reports: string[];
}

function combatant(
  nation: NationState,
  allies: readonly CountryId[],
  nations: Record<CountryId, NationState>,
) {
  let allyPower = 0;
  for (const ally of allies) {
    allyPower += safe(nations[ally]?.military.power);
  }

  return {
    id: nation.id,
    power: nation.military.power,
    techLevel: nation.military.techLevel,
    gdp: nation.economy.gdp,
    defenseBudgetRatio: nation.policy.budget.defense,
    warExhaustion: nation.military.warExhaustion,
    allyPower,
  };
}

/** 진행 중인 모든 전쟁의 이번 분기 결과를 계산한다. */
export function resolveWars(
  state: GameState,
  nations: Record<CountryId, NationState>,
): WarResolution {
  if (state.wars.length === 0) {
    return { wars: [], nations, relations: state.relations, reports: [] };
  }

  const nextNations = { ...nations };
  let relations = state.relations;
  const reports: string[] = [];
  const remaining: War[] = [];

  state.wars.forEach((war, index) => {
    const attacker = nextNations[war.attacker];
    const defender = nextNations[war.defender];
    if (!attacker || !defender) return;

    const rng = deriveRng(state.seed, state.turn, 'war', index);
    const outcome = resolveBattle({
      war,
      attacker: combatant(attacker, alliesOf(state.treaties, war.attacker), nextNations),
      defender: combatant(defender, alliesOf(state.treaties, war.defender), nextNations),
      roll: rng.next(),
    });

    const attackerCost = warCost(attacker.economy.gdp);
    const defenderCost = warCost(defender.economy.gdp);

    nextNations[war.attacker] = {
      ...attacker,
      fiscal: {
        ...attacker.fiscal,
        debt: attacker.fiscal.debt + attackerCost,
        debtToGdp:
          ((attacker.fiscal.debt + attackerCost) / Math.max(attacker.economy.gdp, 1)) * 100,
      },
    };
    nextNations[war.defender] = {
      ...defender,
      fiscal: {
        ...defender.fiscal,
        debt: defender.fiscal.debt + defenderCost,
        debtToGdp:
          ((defender.fiscal.debt + defenderCost) / Math.max(defender.economy.gdp, 1)) * 100,
      },
    };

    const frontline = clamp(war.frontline + outcome.shift, -120, 120);

    if (!outcome.concluded) {
      remaining.push({
        ...war,
        frontline,
        cost: war.cost + attackerCost + defenderCost,
      });
      reports.push(
        `${attacker.name}-${defender.name} 전선 ${frontline > 0 ? '공세 확대' : '교착'} (지수 ${Math.round(frontline)})`,
      );
      return;
    }

    const winnerId = outcome.winner ?? war.defender;
    const loserId = winnerId === war.attacker ? war.defender : war.attacker;
    const winner = nextNations[winnerId];
    const loser = nextNations[loserId];
    if (!winner || !loser) return;

    const reparations = loser.economy.gdp * (MILITARY.war.reparationShareOfGdp / 100);

    nextNations[winnerId] = {
      ...winner,
      fiscal: {
        ...winner.fiscal,
        debt: Math.max(winner.fiscal.debt - reparations, 0),
        debtToGdp:
          (Math.max(winner.fiscal.debt - reparations, 0) / Math.max(winner.economy.gdp, 1)) * 100,
      },
      politics: {
        ...winner.politics,
        approval: clamp(winner.politics.approval + MILITARY.war.victoryApproval, 0, 100),
      },
    };
    nextNations[loserId] = {
      ...loser,
      fiscal: {
        ...loser.fiscal,
        debt: loser.fiscal.debt + reparations,
        debtToGdp: ((loser.fiscal.debt + reparations) / Math.max(loser.economy.gdp, 1)) * 100,
      },
      politics: {
        ...loser.politics,
        approval: clamp(loser.politics.approval + MILITARY.war.defeatApproval, 0, 100),
      },
    };

    relations = adjustRelation(relations, war.attacker, war.defender, 25);
    reports.push(`${winner.name}, ${loser.name}와(과)의 전쟁에서 승리 — 배상금 합의`);
  });

  return { wars: remaining, nations: nextNations, relations, reports };
}

/** 특정 국가가 참여 중인 전쟁 수. */
export function warCountFor(wars: readonly War[], country: CountryId): number {
  return wars.filter((war) => war.attacker === country || war.defender === country).length;
}

export { combatStrength };
