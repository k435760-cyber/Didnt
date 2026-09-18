import type {
  CountryId,
  DiplomaticAction,
  GameState,
  NationState,
  NewsItem,
  TurnResult,
  TurnSummary,
} from '@/types';
import { COUNTRY_IDS } from '@/types/country';
import { MAX_EVENT_HISTORY, MAX_NEWS_ITEMS, TURNS_PER_YEAR } from '@/config/constants';
import { POLITICS } from '@/config/politics';
import { clamp, safe } from '../math';
import { deriveRng } from '../rng';
import { addModifiers } from '../events/modifiers';
import {
  autoChoose,
  findEvent,
  resolveEvent,
  rollEvent,
  type ResolvedEvent,
} from '../events/engine';
import { decideDiplomacy, decidePolicy, shouldDeclareWar } from '../ai';
import { stepPolicyRate, taylorRate } from '../economy/monetary';
import {
  alliesOf,
  applyAction,
  sanctionsAgainst,
  tradeTreatyCount,
  validateAction,
} from '../diplomacy/actions';
import { adjustRelation, driftRelations, getRelation, relationKey } from '../diplomacy/relations';
import { MILITARY } from '@/config/military';
import { generateNews, trimNews, formatQuarter } from '../news';
import { historyPointFrom } from '../state/createGame';
import { simulateNation, trimHistory, type NationTurnReport } from './nation';
import { resolveWars, warCountFor } from './war';

export * from './nation';
export * from './war';

/** 이벤트 선택이 남아 있거나 게임이 끝났으면 턴을 넘길 수 없다. */
export function canAdvanceTurn(state: GameState): boolean {
  return state.pendingEvent === null && state.gameOver === null;
}

function applyResolvedEvent(nation: NationState, resolved: ResolvedEvent): NationState {
  return {
    ...nation,
    modifiers: addModifiers(nation.modifiers, resolved.modifiers),
    fiscal: {
      ...nation.fiscal,
      debt: Math.max(nation.fiscal.debt + resolved.immediate.debt, 0),
    },
    politics: {
      ...nation.politics,
      approval: clamp(nation.politics.approval + resolved.immediate.approval, 0, 100),
      stability: clamp(nation.politics.stability + resolved.immediate.stability, 0, 100),
    },
  };
}

function applyRelationDelta(
  relations: GameState['relations'],
  actor: CountryId,
  delta: number,
): GameState['relations'] {
  if (delta === 0) return relations;
  let next = relations;
  for (const id of COUNTRY_IDS) {
    if (id === actor) continue;
    next = adjustRelation(next, actor, id, delta);
  }
  return next;
}

function countryNames(nations: Record<CountryId, NationState>): Record<string, string> {
  const names: Record<string, string> = {};
  for (const id of COUNTRY_IDS) {
    names[id] = nations[id].name;
  }
  return names;
}

function checkGameOver(state: GameState, player: NationState, turn: number): GameState['gameOver'] {
  if (player.fiscal.debtToGdp >= POLITICS.collapse.debtToGdpThreshold) {
    return { reason: '국가부채가 감당 불가능한 수준에 도달해 국가부도 사태를 맞았습니다.', turn };
  }

  const recent = state.history.slice(-POLITICS.collapse.approvalQuarters + 1);
  const lowQuarters =
    recent.filter((point) => point.approval < POLITICS.collapse.approvalThreshold).length +
    (player.politics.approval < POLITICS.collapse.approvalThreshold ? 1 : 0);

  if (lowQuarters >= POLITICS.collapse.approvalQuarters) {
    return { reason: '장기간 지지율이 바닥에 머물러 정권이 붕괴했습니다.', turn };
  }

  return null;
}

/**
 * 한 턴(1분기) 진행.
 *
 * 규칙에 정의된 순서를 그대로 따르며, 각 단계는 독립 모듈에 위임한다.
 * 이 함수는 순수 함수이며 같은 입력에 대해 항상 같은 결과를 돌려준다.
 */
export function advanceTurn(state: GameState): TurnResult {
  if (!canAdvanceTurn(state)) {
    throw new Error('진행 중인 이벤트 선택을 먼저 처리해야 합니다.');
  }

  const turn = state.turn;
  const before = state.nations;

  // 1) 정부 정책 적용 — 플레이어 정책은 이미 반영되어 있고, AI 는 이 시점에 결정한다.
  const withPolicies = {} as Record<CountryId, NationState>;
  for (const id of COUNTRY_IDS) {
    const nation = before[id];
    if (id === state.playerCountry) {
      // 중앙은행이 독립 운용 중이면 플레이어 대신 테일러 준칙이 금리를 정한다.
      withPolicies[id] = nation.policy.centralBankAuto
        ? {
            ...nation,
            policy: {
              ...nation.policy,
              policyRate: stepPolicyRate(
                nation.policy.policyRate,
                taylorRate(
                  {
                    inflation: nation.economy.inflation,
                    growth: nation.economy.gdpGrowth,
                    potentialGrowth: nation.economy.potentialGrowth,
                  },
                  nation.calibration.taylor,
                ),
              ),
            },
          }
        : nation;
      continue;
    }
    withPolicies[id] = {
      ...nation,
      policy: decidePolicy({
        nation,
        balanceRatio: (nation.fiscal.balance / Math.max(nation.economy.gdp, 1)) * 100,
        potentialGrowth: nation.economy.potentialGrowth,
      }),
    };
  }

  // 2~11, 13) 국가별 시뮬레이션
  const simulated = {} as Record<CountryId, NationState>;
  const reports = {} as Record<CountryId, NationTurnReport>;
  for (const id of COUNTRY_IDS) {
    const wars = warCountFor(state.wars, id);
    const output = simulateNation(withPolicies[id], {
      turn,
      activeWars: wars,
      tradeTreaties: tradeTreatyCount(state.treaties, id),
      sanctionsAgainst: sanctionsAgainst(state.sanctions, id),
      warPenalty: wars > 0 ? MILITARY.war.growthPenalty * wars : 0,
    });
    simulated[id] = output.nation;
    reports[id] = output.report;
  }

  // 12) 외교 관계 업데이트
  let relations = state.relations;
  let treaties = state.treaties;
  let sanctions = state.sanctions;
  const diplomacyLog: DiplomaticAction[] = [];

  for (const id of COUNTRY_IDS) {
    if (id === state.playerCountry) continue;
    const rng = deriveRng(state.seed, turn, 'diplomacy', id);
    const action = decideDiplomacy(
      {
        actor: simulated[id],
        candidates: COUNTRY_IDS,
        relations,
        treaties,
        sanctions,
        turn,
      },
      rng,
    );
    if (!action) continue;

    const result = applyAction({
      ...action,
      relations,
      treaties: [...treaties],
      sanctions: [...sanctions],
      turn,
    });
    relations = result.relations;
    treaties = result.treaties;
    sanctions = result.sanctions;
    diplomacyLog.push(action);

    if (result.costShareOfGdp > 0) {
      const actor = simulated[id];
      const cost = actor.economy.gdp * result.costShareOfGdp;
      simulated[id] = {
        ...actor,
        fiscal: { ...actor.fiscal, debt: Math.max(actor.fiscal.debt + cost, 0) },
      };
    }
  }

  const powerIndex = {} as Record<CountryId, number>;
  for (const id of COUNTRY_IDS) {
    powerIndex[id] = simulated[id].military.power;
  }
  const treatyBonus: Record<string, number> = {};
  for (const treaty of treaties) {
    const key = relationKey(treaty.a, treaty.b);
    treatyBonus[key] = (treatyBonus[key] ?? 0) + (treaty.kind === 'alliance' ? 25 : 12);
  }
  relations = driftRelations({
    matrix: relations,
    profiles: COUNTRY_IDS.map((id) => ({
      id,
      name: simulated[id].name,
      shortName: simulated[id].name,
      personality: simulated[id].personality,
      bloc: 'asia',
    })),
    power: powerIndex,
    treatyBonus,
  });

  // 13) 군사 — 전쟁 선포와 전황 판정
  let wars = [...state.wars];
  for (const id of COUNTRY_IDS) {
    if (id === state.playerCountry) continue;
    const rng = deriveRng(state.seed, turn, 'war-decision', id);
    for (const target of COUNTRY_IDS) {
      if (target === id) continue;
      const alreadyAtWar = wars.some(
        (war) =>
          (war.attacker === id && war.defender === target) ||
          (war.attacker === target && war.defender === id),
      );
      const declared = shouldDeclareWar(
        {
          actor: simulated[id],
          target: simulated[target],
          relation: getRelation(relations, id, target),
          actorAllies: alliesOf(treaties, id).length,
          targetAllies: alliesOf(treaties, target).length,
          alreadyAtWar,
        },
        rng,
      );
      if (!declared) continue;
      wars.push({ attacker: id, defender: target, startedTurn: turn, frontline: 0, cost: 0 });
      relations = adjustRelation(relations, id, target, -40);
    }
  }

  const warResolution = resolveWars({ ...state, wars, relations, treaties }, simulated);
  wars = warResolution.wars;
  relations = warResolution.relations;
  let nations = warResolution.nations;

  // 14) 랜덤 이벤트
  let activeEvents = state.activeEvents
    .map((event) => ({ ...event, remainingTurns: event.remainingTurns - 1 }))
    .filter((event) => event.remainingTurns > 0);
  let eventHistory = [...state.eventHistory];
  let pendingEvent: GameState['pendingEvent'] = null;
  const eventTitles: string[] = [];
  const hadEventLastTurn = state.eventHistory.some((entry) => entry.turn === turn - 1);

  for (const id of COUNTRY_IDS) {
    const rng = deriveRng(state.seed, turn, 'event', id);
    const nation = nations[id];
    const event = rollEvent(
      {
        turn,
        nation,
        atWar: warCountFor(wars, id) > 0,
        history: eventHistory,
        activeEvents: id === state.playerCountry ? activeEvents : [],
        hadEventLastTurn,
      },
      rng,
    );
    if (!event) continue;

    const isPlayer = id === state.playerCountry;
    if (isPlayer && event.choices && event.choices.length > 0) {
      pendingEvent = { eventId: event.id, turn: turn + 1 };
      eventTitles.push(event.title);
      continue;
    }

    const choiceId = event.choices ? autoChoose(event, rng) : null;
    const resolved = resolveEvent(event, choiceId, turn + 1);
    nations = { ...nations, [id]: applyResolvedEvent(nations[id], resolved) };
    relations = applyRelationDelta(relations, id, resolved.immediate.relationDelta);
    eventHistory = [...eventHistory, resolved.historyEntry];
    if (isPlayer) {
      activeEvents = [...activeEvents, resolved.active];
      eventTitles.push(event.title);
    }
  }

  // 15) 뉴스 생성
  const playerBefore = before[state.playerCountry];
  const playerAfter = nations[state.playerCountry];
  const { year, quarter } = formatQuarter(turn + 1, state.startYear);
  const newsRng = deriveRng(state.seed, turn, 'news');
  const generated: NewsItem[] = generateNews(
    {
      turn: turn + 1,
      year,
      quarter,
      before: playerBefore,
      after: playerAfter,
      eventTitles,
      diplomacy: diplomacyLog.filter(
        (action) => action.actor === state.playerCountry || action.target === state.playerCountry,
      ),
      warReports: warResolution.reports,
      countryNames: countryNames(nations),
    },
    newsRng,
  );

  // 16) 다음 턴
  const nextTurn = turn + 1;
  const history = trimHistory([
    ...state.history,
    historyPointFrom(playerAfter, nextTurn, state.startYear),
  ]);

  const nextState: GameState = {
    ...state,
    turn: nextTurn,
    nations,
    relations,
    treaties,
    sanctions,
    wars,
    activeEvents,
    eventHistory: eventHistory.slice(-MAX_EVENT_HISTORY),
    pendingEvent,
    news: trimNews([...state.news, ...generated], MAX_NEWS_ITEMS),
    history,
    gameOver: null,
  };

  nextState.gameOver = checkGameOver(nextState, playerAfter, nextTurn);

  const summary: TurnSummary = {
    turn: nextTurn,
    gdpGrowth: playerAfter.economy.gdpGrowth,
    inflationDelta: playerAfter.economy.inflation - playerBefore.economy.inflation,
    unemploymentDelta: playerAfter.economy.unemployment - playerBefore.economy.unemployment,
    approvalDelta: playerAfter.politics.approval - playerBefore.politics.approval,
    balance: playerAfter.fiscal.balance,
    debtDelta: playerAfter.fiscal.debtToGdp - playerBefore.fiscal.debtToGdp,
    populationDelta: playerAfter.population.total - playerBefore.population.total,
  };

  return { state: nextState, summary };
}

/** 플레이어가 이벤트 선택지를 고르면 그 효과를 즉시 반영한다. */
export function resolvePendingEvent(state: GameState, choiceId: string): GameState {
  if (!state.pendingEvent) return state;

  const event = findEvent(state.pendingEvent.eventId);
  if (!event) return { ...state, pendingEvent: null };

  const resolved = resolveEvent(event, choiceId, state.pendingEvent.turn);
  const player = state.nations[state.playerCountry];

  return {
    ...state,
    nations: { ...state.nations, [state.playerCountry]: applyResolvedEvent(player, resolved) },
    relations: applyRelationDelta(
      state.relations,
      state.playerCountry,
      resolved.immediate.relationDelta,
    ),
    activeEvents: [...state.activeEvents, resolved.active],
    eventHistory: [...state.eventHistory, resolved.historyEntry].slice(-MAX_EVENT_HISTORY),
    pendingEvent: null,
    news: trimNews(
      [
        ...state.news,
        {
          id: `${state.pendingEvent.turn}-choice`,
          turn: state.pendingEvent.turn,
          headline: `정부, ${event.title} 대응책 발표`,
          body: `${resolved.historyEntry.choiceLabel ?? '대응 방침'}을(를) 채택했습니다.`,
          tone: 'neutral' as const,
          section: 'politics' as const,
        },
      ],
      MAX_NEWS_ITEMS,
    ),
  };
}

export interface DiplomacyOutcome {
  state: GameState;
  error: string | null;
}

/** 플레이어의 외교 행동. 검증에 실패하면 상태를 바꾸지 않고 사유를 돌려준다. */
export function performDiplomaticAction(
  state: GameState,
  action: DiplomaticAction,
): DiplomacyOutcome {
  const validation = validateAction({
    ...action,
    relations: state.relations,
    treaties: [...state.treaties],
    sanctions: [...state.sanctions],
    turn: state.turn,
  });
  if (!validation.allowed) return { state, error: validation.reason };

  const result = applyAction({
    ...action,
    relations: state.relations,
    treaties: [...state.treaties],
    sanctions: [...state.sanctions],
    turn: state.turn,
  });

  const actor = state.nations[action.actor];
  const cost = actor.economy.gdp * result.costShareOfGdp;

  return {
    state: {
      ...state,
      relations: result.relations,
      treaties: result.treaties,
      sanctions: result.sanctions,
      nations: {
        ...state.nations,
        [action.actor]: {
          ...actor,
          fiscal: { ...actor.fiscal, debt: Math.max(actor.fiscal.debt + cost, 0) },
        },
      },
    },
    error: null,
  };
}

/** 플레이어의 선전포고. */
export function declareWar(state: GameState, target: CountryId): DiplomacyOutcome {
  if (target === state.playerCountry) return { state, error: '자국에는 선전포고할 수 없습니다.' };

  const exists = state.wars.some(
    (war) =>
      (war.attacker === state.playerCountry && war.defender === target) ||
      (war.attacker === target && war.defender === state.playerCountry),
  );
  if (exists) return { state, error: '이미 교전 중입니다.' };

  return {
    state: {
      ...state,
      wars: [
        ...state.wars,
        {
          attacker: state.playerCountry,
          defender: target,
          startedTurn: state.turn,
          frontline: 0,
          cost: 0,
        },
      ],
      relations: adjustRelation(state.relations, state.playerCountry, target, -45),
    },
    error: null,
  };
}

/** 현재 턴의 연도/분기 표기. */
export function currentPeriod(state: GameState): { year: number; quarter: number } {
  return formatQuarter(state.turn, state.startYear);
}

export function yearsElapsed(state: GameState): number {
  return safe(state.turn) / TURNS_PER_YEAR;
}
