import type {
  ActiveEvent,
  EventCondition,
  EventHistoryEntry,
  GameEventDefinition,
  Modifier,
  NationState,
} from '@/types';
import { EVENTS } from '@/config/events';
import { safe } from '../math';
import type { Rng } from '../rng';
import { EVENT_CATALOG, findEvent } from './catalog';

export interface EventContext {
  turn: number;
  nation: NationState;
  atWar: boolean;
  history: readonly EventHistoryEntry[];
  activeEvents: readonly ActiveEvent[];
  /** 직전 턴에 이벤트가 발생했는지. 연속 발생을 억제한다. */
  hadEventLastTurn: boolean;
}

function matchesConditions(condition: EventCondition | undefined, ctx: EventContext): boolean {
  if (!condition) return true;
  const { economy, fiscal, politics, population, policy } = ctx.nation;

  if (condition.minTurn !== undefined && ctx.turn < condition.minTurn) return false;
  if (condition.minInflation !== undefined && economy.inflation < condition.minInflation)
    return false;
  if (condition.maxInflation !== undefined && economy.inflation > condition.maxInflation)
    return false;
  if (condition.minUnemployment !== undefined && economy.unemployment < condition.minUnemployment) {
    return false;
  }
  if (condition.minDebtToGdp !== undefined && fiscal.debtToGdp < condition.minDebtToGdp)
    return false;
  if (condition.maxApproval !== undefined && politics.approval > condition.maxApproval)
    return false;
  if (
    condition.minElderlyShare !== undefined &&
    population.elderlyShare < condition.minElderlyShare
  ) {
    return false;
  }
  if (condition.maxFertility !== undefined && population.fertilityRate > condition.maxFertility) {
    return false;
  }
  if (
    condition.minEnergyDependence !== undefined &&
    economy.energyDependence < condition.minEnergyDependence
  ) {
    return false;
  }
  if (
    condition.minResearchBudget !== undefined &&
    policy.budget.research < condition.minResearchBudget
  ) {
    return false;
  }
  if (condition.requiresWar !== undefined && condition.requiresWar !== ctx.atWar) return false;

  return true;
}

function onCooldown(event: GameEventDefinition, ctx: EventContext): boolean {
  if (ctx.activeEvents.some((active) => active.eventId === event.id)) return true;

  for (const entry of ctx.history) {
    if (entry.eventId !== event.id) continue;
    if (ctx.turn - entry.turn < event.cooldown) return true;
  }
  return false;
}

/** 조건을 만족하는 이벤트만 후보로 남긴다. */
export function eligibleEvents(ctx: EventContext): GameEventDefinition[] {
  return EVENT_CATALOG.filter(
    (event) => !onCooldown(event, ctx) && matchesConditions(event.conditions, ctx),
  );
}

/** 후보 이벤트의 선택 가중치. 조건부 이벤트는 조건을 만족했을 때 더 자주 뜬다. */
export function eventWeight(event: GameEventDefinition, hasCondition: boolean): number {
  const categoryWeight = EVENTS.categoryWeight[event.category];
  const boost = hasCondition ? EVENTS.conditionBoost : 1;
  return event.probability * categoryWeight * boost;
}

/** 이번 턴에 이벤트가 발생할 확률. */
export function eventChance(ctx: EventContext): number {
  if (ctx.turn < EVENTS.warmupTurns) return 0;
  const damping = ctx.hadEventLastTurn ? EVENTS.consecutiveDamping : 1;
  return EVENTS.baseChance * damping;
}

/**
 * 이벤트 추첨.
 * rng 는 (seed, turn, 'event', countryId) 로 파생된 독립 스트림이므로
 * 같은 seed·같은 상태에서는 항상 같은 이벤트가 나온다.
 */
export function rollEvent(ctx: EventContext, rng: Rng): GameEventDefinition | null {
  if (!rng.chance(eventChance(ctx))) return null;

  const candidates = eligibleEvents(ctx);
  if (candidates.length === 0) return null;

  return rng.weighted(candidates, (event) => eventWeight(event, Boolean(event.conditions)));
}

export interface ResolvedEvent {
  active: ActiveEvent;
  modifiers: Modifier[];
  historyEntry: EventHistoryEntry;
  immediate: {
    debt: number;
    approval: number;
    stability: number;
    relationDelta: number;
  };
}

/** 선택지가 없는 이벤트, 또는 선택이 끝난 이벤트를 상태 변경값으로 변환한다. */
export function resolveEvent(
  event: GameEventDefinition,
  choiceId: string | null,
  turn: number,
): ResolvedEvent {
  const choice = choiceId ? (event.choices?.find((c) => c.id === choiceId) ?? null) : null;
  const modifiers = choice ? choice.modifiers : event.effects;

  return {
    active: {
      eventId: event.id,
      title: event.title,
      category: event.category,
      startedTurn: turn,
      choiceId: choice?.id ?? null,
      remainingTurns: event.duration,
    },
    modifiers: modifiers.map((m) => ({ ...m })),
    historyEntry: {
      turn,
      eventId: event.id,
      title: event.title,
      choiceId: choice?.id ?? null,
      choiceLabel: choice?.label ?? null,
    },
    immediate: {
      debt: safe(choice?.immediate?.debt),
      approval: safe(choice?.immediate?.approval),
      stability: safe(choice?.immediate?.stability),
      relationDelta: safe(choice?.immediate?.relations?.delta),
    },
  };
}

/** AI 국가는 성향과 무관하게 결정적으로 선택지를 고른다(재현성 보장). */
export function autoChoose(event: GameEventDefinition, rng: Rng): string | null {
  if (!event.choices || event.choices.length === 0) return null;
  return rng.pick(event.choices).id;
}

export { EVENT_CATALOG, findEvent };
