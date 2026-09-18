import type { CountryId, DiplomaticActionType, RelationMatrix, Sanction, Treaty } from '@/types';
import { ACTION_LABELS, DIPLOMACY } from '@/config/diplomacy';
import { adjustRelation, getRelation } from './relations';

export interface DiplomacySlice {
  relations: RelationMatrix;
  treaties: Treaty[];
  sanctions: Sanction[];
}

export interface ActionContext extends DiplomacySlice {
  actor: CountryId;
  target: CountryId;
  type: DiplomaticActionType;
  turn: number;
}

export interface ActionValidation {
  allowed: boolean;
  reason: string | null;
}

export function hasTreaty(
  treaties: readonly Treaty[],
  kind: Treaty['kind'],
  a: CountryId,
  b: CountryId,
): boolean {
  return treaties.some(
    (t) => t.kind === kind && ((t.a === a && t.b === b) || (t.a === b && t.b === a)),
  );
}

export function hasSanction(sanctions: readonly Sanction[], by: CountryId, on: CountryId): boolean {
  return sanctions.some((s) => s.by === by && s.on === on);
}

/** 행동 가능 여부 판정. UI 는 이 결과로 버튼 비활성화 사유를 보여준다. */
export function validateAction(ctx: ActionContext): ActionValidation {
  if (ctx.actor === ctx.target) return { allowed: false, reason: '자국에는 사용할 수 없습니다.' };

  const relation = getRelation(ctx.relations, ctx.actor, ctx.target);
  const requirement = DIPLOMACY.requirements[ctx.type];
  const label = ACTION_LABELS[ctx.type];

  if (requirement.minRelation !== undefined && relation < requirement.minRelation) {
    return {
      allowed: false,
      reason: `${label}은(는) 관계도 ${requirement.minRelation} 이상이 필요합니다.`,
    };
  }
  if (requirement.maxRelation !== undefined && relation > requirement.maxRelation) {
    return {
      allowed: false,
      reason: `${label}은(는) 관계도 ${requirement.maxRelation} 이하에서만 가능합니다.`,
    };
  }

  if (ctx.type === 'trade_agreement' && hasTreaty(ctx.treaties, 'trade', ctx.actor, ctx.target)) {
    return { allowed: false, reason: '이미 무역협정을 체결한 상대입니다.' };
  }
  if (ctx.type === 'alliance' && hasTreaty(ctx.treaties, 'alliance', ctx.actor, ctx.target)) {
    return { allowed: false, reason: '이미 동맹 관계입니다.' };
  }
  if (ctx.type === 'sanction' && hasSanction(ctx.sanctions, ctx.actor, ctx.target)) {
    return { allowed: false, reason: '이미 제재를 부과하고 있습니다.' };
  }

  return { allowed: true, reason: null };
}

export interface ActionResult extends DiplomacySlice {
  /** 행위국이 부담하는 비용(GDP 대비 비율). */
  costShareOfGdp: number;
  message: string;
}

/** 외교 행동을 적용한다. 검증은 호출부에서 먼저 수행한다. */
export function applyAction(ctx: ActionContext): ActionResult {
  const effect = DIPLOMACY.actionEffects[ctx.type];
  let relations = adjustRelation(ctx.relations, ctx.actor, ctx.target, effect.relation);
  let treaties = ctx.treaties;
  let sanctions = ctx.sanctions;

  if (ctx.type === 'trade_agreement') {
    treaties = [...treaties, { kind: 'trade', a: ctx.actor, b: ctx.target, since: ctx.turn }];
  }

  if (ctx.type === 'alliance') {
    treaties = [...treaties, { kind: 'alliance', a: ctx.actor, b: ctx.target, since: ctx.turn }];
  }

  if (ctx.type === 'sanction') {
    sanctions = [...sanctions, { by: ctx.actor, on: ctx.target, since: ctx.turn }];
    // 제재는 제재국과 피제재국의 우방 관계까지 함께 악화시킨다.
    relations = adjustRelation(relations, ctx.actor, ctx.target, 0);
  }

  return {
    relations,
    treaties,
    sanctions,
    costShareOfGdp: effect.cost,
    message: `${ACTION_LABELS[ctx.type]} 시행`,
  };
}

/** 특정 국가에 걸린 제재 수. 수출 비율 계산에 쓴다. */
export function sanctionsAgainst(sanctions: readonly Sanction[], target: CountryId): number {
  return sanctions.filter((s) => s.on === target).length;
}

export function tradeTreatyCount(treaties: readonly Treaty[], country: CountryId): number {
  return treaties.filter((t) => t.kind === 'trade' && (t.a === country || t.b === country)).length;
}

export function alliesOf(treaties: readonly Treaty[], country: CountryId): CountryId[] {
  const allies: CountryId[] = [];
  for (const treaty of treaties) {
    if (treaty.kind !== 'alliance') continue;
    if (treaty.a === country) allies.push(treaty.b);
    else if (treaty.b === country) allies.push(treaty.a);
  }
  return allies;
}
