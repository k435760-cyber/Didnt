import type {
  BudgetAllocation,
  CountryId,
  DiplomaticAction,
  DiplomaticActionType,
  NationState,
  PolicyState,
  RelationMatrix,
  Sanction,
  Treaty,
} from '@/types';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import { DIPLOMACY } from '@/config/diplomacy';
import { clamp, safe } from '../math';
import { stepPolicyRate, taylorRate } from '../economy/monetary';
import { totalBudgetRatio } from '../economy/spending';
import { applyPolicy } from '../government/policy';
import { getRelation, relationStatus } from '../diplomacy/relations';
import { validateAction } from '../diplomacy/actions';
import type { Rng } from '../rng';
import { BUDGET_PREFERENCE, TAX_PREFERENCE, WAR_APPETITE } from './profiles';

export * from './profiles';

/** 재정 상황에 따라 총지출 규모를 조정하는 폭(%p/분기). */
const SPENDING_ADJUST_STEP = 0.35;
const BUDGET_CONVERGENCE = 0.18;
const TAX_CONVERGENCE = 0.12;

export interface AiPolicyInput {
  nation: NationState;
  /** GDP 대비 재정수지(%). */
  balanceRatio: number;
  potentialGrowth: number;
}

/**
 * AI 국가의 재정·조세·통화 결정.
 * 난수를 쓰지 않으므로 같은 상태에서는 항상 같은 결정을 내린다.
 */
export function decidePolicy(input: AiPolicyInput): PolicyState {
  const { nation } = input;
  const preference = BUDGET_PREFERENCE[nation.personality];
  const taxGoal = TAX_PREFERENCE[nation.personality];

  const currentTotal = totalBudgetRatio(nation.policy.budget);
  const debtPressure = nation.fiscal.debtToGdp > 120 || input.balanceRatio < -6;
  const hasRoom = input.balanceRatio > -1.5 && nation.fiscal.debtToGdp < 90;

  let targetTotal = currentTotal;
  if (debtPressure) targetTotal -= SPENDING_ADJUST_STEP;
  else if (hasRoom && nation.politics.approval < 50) targetTotal += SPENDING_ADJUST_STEP;
  targetTotal = clamp(targetTotal, 8, 48);

  const budget = {} as BudgetAllocation;
  for (const category of BUDGET_CATEGORIES) {
    const desired = targetTotal * preference[category];
    budget[category] =
      nation.policy.budget[category] +
      (desired - nation.policy.budget[category]) * BUDGET_CONVERGENCE;
  }

  // 재정 압박이 크면 목표 세율보다 조금 더 높게 간다.
  const taxBias = debtPressure ? 2.5 : hasRoom ? -1 : 0;
  const tax = {
    income:
      nation.policy.tax.income +
      (taxGoal.income + taxBias - nation.policy.tax.income) * TAX_CONVERGENCE,
    corporate:
      nation.policy.tax.corporate +
      (taxGoal.corporate + taxBias - nation.policy.tax.corporate) * TAX_CONVERGENCE,
    consumption:
      nation.policy.tax.consumption +
      (taxGoal.consumption + taxBias - nation.policy.tax.consumption) * TAX_CONVERGENCE,
  };

  const policyRate = stepPolicyRate(
    nation.policy.policyRate,
    taylorRate(
      {
        inflation: nation.economy.inflation,
        growth: nation.economy.gdpGrowth,
        potentialGrowth: input.potentialGrowth,
      },
      nation.calibration.taylor,
    ),
  );

  return applyPolicy(nation.policy, { tax, budget, policyRate, centralBankAuto: true });
}

export interface AiDiplomacyInput {
  actor: NationState;
  candidates: readonly CountryId[];
  relations: RelationMatrix;
  treaties: readonly Treaty[];
  sanctions: readonly Sanction[];
  turn: number;
}

const ACTION_TYPES: DiplomaticActionType[] = [
  'trade_agreement',
  'aid',
  'sanction',
  'alliance',
  'summit',
  'threaten',
];

/** 성향 가중치와 현재 관계도를 기반으로 이번 턴의 외교 행동을 하나 고른다. */
export function decideDiplomacy(input: AiDiplomacyInput, rng: Rng): DiplomaticAction | null {
  const weights = DIPLOMACY.personalityWeights[input.actor.personality];

  interface Candidate {
    action: DiplomaticAction;
    weight: number;
  }

  const options: Candidate[] = [];

  for (const target of input.candidates) {
    if (target === input.actor.id) continue;
    const relation = getRelation(input.relations, input.actor.id, target);
    const status = relationStatus(relation);

    for (const type of ACTION_TYPES) {
      const validation = validateAction({
        actor: input.actor.id,
        target,
        type,
        relations: input.relations,
        treaties: [...input.treaties],
        sanctions: [...input.sanctions],
        turn: input.turn,
      });
      if (!validation.allowed) continue;

      // 관계가 나쁠수록 적대적 행동의 가중치가, 좋을수록 협력 행동의 가중치가 올라간다.
      const hostile = type === 'sanction' || type === 'threaten';
      const affinity = hostile ? (100 - relation) / 200 : (relation + 100) / 200;
      const urgency = status === 'hostile' && !hostile ? 0.4 : 1;

      options.push({
        action: { type, actor: input.actor.id, target },
        weight: weights[type] * affinity * urgency,
      });
    }
  }

  if (options.length === 0) return null;

  // 아무 행동도 하지 않을 가능성을 충분히 남긴다.
  const inaction = options.reduce((acc, option) => acc + option.weight, 0) * 1.6;
  if (rng.next() * (inaction + 1) < inaction * 0.72) return null;

  return rng.weighted(options, (option) => option.weight)?.action ?? null;
}

export interface WarDecisionInput {
  actor: NationState;
  target: NationState;
  relation: number;
  actorAllies: number;
  targetAllies: number;
  alreadyAtWar: boolean;
}

/** AI 의 전쟁 개시 판단. 관계·전력비·성향이 모두 충족되어야 한다. */
export function shouldDeclareWar(input: WarDecisionInput, rng: Rng): boolean {
  if (input.alreadyAtWar) return false;
  if (input.relation > -55) return false;
  if (input.actor.military.warExhaustion > 30) return false;

  const powerRatio =
    (safe(input.actor.military.power) + input.actorAllies * 0.3) /
    Math.max(safe(input.target.military.power) + input.targetAllies * 0.3, 1);
  if (powerRatio < 1.35) return false;

  const appetite = WAR_APPETITE[input.actor.personality];
  return rng.chance(0.06 * appetite * Math.min(powerRatio - 1, 1.5));
}
