import type { BudgetCategory } from './fiscal';
import type { CountryId } from './country';

export type EventCategory = 'economy' | 'society' | 'disaster' | 'international' | 'technology';

/** 이벤트가 상태에 남기는 지속 효과. 매 턴 시뮬레이션 각 단계에서 읽어 쓴다. */
export type ModifierField =
  | 'gdpGrowth'
  | 'inflation'
  | 'unemployment'
  | 'consumption'
  | 'investment'
  | 'exports'
  | 'imports'
  | 'productivity'
  | 'competitiveness'
  | 'approval'
  | 'stability'
  | 'fertility'
  | 'migration'
  | 'debt'
  | 'revenue'
  | 'spending'
  | 'militaryReadiness'
  | 'energyCost';

export interface Modifier {
  field: ModifierField;
  /** 해당 필드에 더해지는 값. 단위는 필드마다 다르며 각 모듈 주석에 명시한다. */
  value: number;
  /** 남은 분기 수. 0 이하가 되면 제거된다. */
  turns: number;
  label: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  /** 플레이어에게 보여줄 예상 효과 문구. */
  outlook: string[];
  modifiers: Modifier[];
  /** 즉시 반영되는 일회성 효과. */
  immediate?: {
    debt?: number;
    approval?: number;
    stability?: number;
    relations?: { target: CountryId | 'all'; delta: number };
  };
}

export interface EventCondition {
  minTurn?: number;
  minInflation?: number;
  maxInflation?: number;
  minUnemployment?: number;
  minDebtToGdp?: number;
  maxApproval?: number;
  minElderlyShare?: number;
  maxFertility?: number;
  minEnergyDependence?: number;
  minResearchBudget?: number;
  requiresWar?: boolean;
}

export interface GameEventDefinition {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  /** 분기당 기본 발생 확률(0~1). 조건 충족 시 가중치가 곱해진다. */
  probability: number;
  conditions?: EventCondition;
  /** 선택지가 없는 이벤트의 지속 분기 수. */
  duration: number;
  /** 선택지가 없을 때 자동 적용되는 효과. */
  effects: Modifier[];
  choices?: EventChoice[];
  /** 같은 이벤트가 다시 뜨기까지 필요한 최소 분기 수. */
  cooldown: number;
}

export interface PendingEvent {
  eventId: string;
  turn: number;
}

export interface ActiveEvent {
  eventId: string;
  title: string;
  category: EventCategory;
  startedTurn: number;
  /** 선택한 선택지 id. 선택지가 없으면 null. */
  choiceId: string | null;
  remainingTurns: number;
}

export interface EventHistoryEntry {
  turn: number;
  eventId: string;
  title: string;
  choiceId: string | null;
  choiceLabel: string | null;
}

export interface BudgetHint {
  category: BudgetCategory;
  direction: 'up' | 'down';
}
