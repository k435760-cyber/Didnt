import type { DiplomaticActionType, Personality, RelationStatus } from '@/types';

export interface ActionRequirement {
  minRelation?: number;
  maxRelation?: number;
}

const ACTION_REQUIREMENTS: Record<DiplomaticActionType, ActionRequirement> = {
  trade_agreement: { minRelation: 10 },
  alliance: { minRelation: 60 },
  aid: { minRelation: -60 },
  sanction: { maxRelation: 30 },
  summit: { minRelation: -80 },
  threaten: { maxRelation: 60 },
};

export const DIPLOMACY = {
  /** 관계도 구간. 하한 이상이면 해당 상태. */
  thresholds: [
    { status: 'allied' as RelationStatus, min: 70 },
    { status: 'friendly' as RelationStatus, min: 25 },
    { status: 'neutral' as RelationStatus, min: -24 },
    { status: 'tense' as RelationStatus, min: -60 },
    { status: 'hostile' as RelationStatus, min: -100 },
  ],

  /** 매 턴 관계도가 기준선으로 되돌아가는 속도. */
  driftSpeed: 0.06,

  /** 외교 행동의 직접 효과. */
  actionEffects: {
    trade_agreement: { relation: 12, cost: 0, cooldown: 4 },
    aid: { relation: 15, cost: 0.004, cooldown: 2 },
    sanction: { relation: -22, cost: 0.002, cooldown: 4 },
    alliance: { relation: 18, cost: 0, cooldown: 8 },
    summit: { relation: 7, cost: 0.0008, cooldown: 1 },
    threaten: { relation: -18, cost: 0, cooldown: 3 },
  } satisfies Record<DiplomaticActionType, { relation: number; cost: number; cooldown: number }>,

  /** 행동 성립 요건. */
  requirements: ACTION_REQUIREMENTS,

  /** 성향별 행동 선호 가중치. AI 국가의 rule-based 의사결정에 쓴다. */
  personalityWeights: {
    aggressive: {
      threaten: 3,
      sanction: 2.2,
      alliance: 1,
      trade_agreement: 0.6,
      aid: 0.3,
      summit: 0.8,
    },
    neutral: {
      threaten: 0.6,
      sanction: 0.8,
      alliance: 1,
      trade_agreement: 1.4,
      aid: 1,
      summit: 1.4,
    },
    economic: {
      threaten: 0.3,
      sanction: 0.7,
      alliance: 0.8,
      trade_agreement: 3,
      aid: 1.4,
      summit: 1.6,
    },
    diplomatic: {
      threaten: 0.2,
      sanction: 0.5,
      alliance: 2.2,
      trade_agreement: 1.8,
      aid: 2.4,
      summit: 2.6,
    },
    isolationist: {
      threaten: 0.8,
      sanction: 1.2,
      alliance: 0.3,
      trade_agreement: 0.4,
      aid: 0.2,
      summit: 0.5,
    },
  } satisfies Record<Personality, Record<DiplomaticActionType, number>>,

  /** 성향별 관계도 기준선 보정. */
  personalityBias: {
    aggressive: -12,
    neutral: 0,
    economic: 6,
    diplomatic: 12,
    isolationist: -4,
  } satisfies Record<Personality, number>,

  /** 같은 블록(지역)이면 기준선이 높다. */
  sameBlocBonus: 10,

  /** 군사력 격차가 크면 긴장이 높아진다. */
  powerGapWeight: 6,

  /** 동맹/무역협정이 경제에 주는 효과는 economy config 의 trade 항목을 참조한다. */
  aidCostShareOfGdp: 0.004,
} as const;

export const RELATION_LABELS: Record<RelationStatus, string> = {
  hostile: '적대',
  tense: '긴장',
  neutral: '중립',
  friendly: '우호',
  allied: '동맹',
};

export const ACTION_LABELS: Record<DiplomaticActionType, string> = {
  trade_agreement: '무역협정',
  aid: '원조',
  sanction: '제재',
  alliance: '동맹',
  summit: '외교 회담',
  threaten: '군사 위협',
};

export const PERSONALITY_LABELS: Record<Personality, string> = {
  aggressive: '팽창주의',
  neutral: '실용주의',
  economic: '중상주의',
  diplomatic: '국제협조',
  isolationist: '고립주의',
};

/**
 * 게임 시작 시점의 양자 관계도.
 * 키는 국가코드를 사전순으로 정렬한 `A:B` 형식이며, 정의되지 않은 쌍은
 * 성향·지역 기반 기준선으로 채워진다.
 */
export const INITIAL_RELATIONS: Record<string, number> = {
  'CHN:DEU': 22,
  'CHN:FRA': 18,
  'CHN:GBR': 5,
  'CHN:IND': -28,
  'CHN:JPN': -18,
  'CHN:KOR': 10,
  'CHN:USA': -42,
  'DEU:FRA': 78,
  'DEU:GBR': 45,
  'DEU:IND': 30,
  'DEU:JPN': 48,
  'DEU:KOR': 42,
  'DEU:USA': 58,
  'FRA:GBR': 40,
  'FRA:IND': 35,
  'FRA:JPN': 44,
  'FRA:KOR': 38,
  'FRA:USA': 55,
  'GBR:IND': 38,
  'GBR:JPN': 46,
  'GBR:KOR': 40,
  'GBR:USA': 76,
  'IND:JPN': 52,
  'IND:KOR': 34,
  'IND:USA': 46,
  'JPN:KOR': 14,
  'JPN:USA': 74,
  'KOR:USA': 72,
};

/** 게임 시작 시 이미 맺어져 있는 협정. */
export const INITIAL_TREATIES: { kind: 'trade' | 'alliance'; a: string; b: string }[] = [
  { kind: 'alliance', a: 'KOR', b: 'USA' },
  { kind: 'alliance', a: 'JPN', b: 'USA' },
  { kind: 'alliance', a: 'GBR', b: 'USA' },
  { kind: 'alliance', a: 'DEU', b: 'FRA' },
  { kind: 'trade', a: 'DEU', b: 'FRA' },
  { kind: 'trade', a: 'CHN', b: 'KOR' },
  { kind: 'trade', a: 'CHN', b: 'DEU' },
  { kind: 'trade', a: 'IND', b: 'GBR' },
];
