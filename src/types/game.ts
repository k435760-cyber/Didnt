import type { CountryId, Personality } from './country';
import type { EconomyState } from './economy';
import type { BudgetAllocation, FiscalState, TaxPolicy } from './fiscal';
import type { PopulationState } from './population';
import type { PoliticsState } from './politics';
import type { MilitaryState, War } from './military';
import type { RelationMatrix, Sanction, Treaty } from './diplomacy';
import type { ActiveEvent, EventHistoryEntry, Modifier, PendingEvent } from './events';
import type { NewsItem } from './news';
import type { Calibration } from './calibration';

export interface PolicyState {
  tax: TaxPolicy;
  budget: BudgetAllocation;
  /** 플레이어/AI가 설정한 기준금리 목표(%). */
  policyRate: number;
  /**
   * 중앙은행 독립 운용 여부.
   * true 면 테일러 준칙에 따라 매 턴 금리가 자동 조정된다(기본값).
   * false 면 플레이어가 직접 금리를 정하며, 물가 안정 책임도 함께 진다.
   */
  centralBankAuto: boolean;
}

export interface NationState {
  id: CountryId;
  name: string;
  personality: Personality;
  economy: EconomyState;
  fiscal: FiscalState;
  population: PopulationState;
  politics: PoliticsState;
  military: MilitaryState;
  policy: PolicyState;
  /** 직전 턴 시뮬레이션에 실제로 반영된 정책. 정책 '변화량' 효과를 계산하는 기준이다. */
  lastAppliedPolicy: PolicyState;
  modifiers: Modifier[];
  /** 게임 시작 시 역산되는 국가별 구조 상수. 초기 상태를 균형점으로 만든다. */
  calibration: Calibration;
}

/** 차트에 쓰는 분기별 스냅샷. 필요한 지표만 남겨 메모리를 제한한다. */
export interface HistoryPoint {
  turn: number;
  year: number;
  quarter: number;
  gdp: number;
  gdpGrowth: number;
  potentialGrowth: number;
  gdpPerCapita: number;
  inflation: number;
  unemployment: number;
  debtToGdp: number;
  approval: number;
  population: number;
  balance: number;
}

export interface GameState {
  version: number;
  seed: string;
  turn: number;
  startYear: number;
  playerCountry: CountryId;
  nations: Record<CountryId, NationState>;
  relations: RelationMatrix;
  treaties: Treaty[];
  sanctions: Sanction[];
  wars: War[];
  activeEvents: ActiveEvent[];
  eventHistory: EventHistoryEntry[];
  pendingEvent: PendingEvent | null;
  news: NewsItem[];
  history: HistoryPoint[];
  /** 플레이어가 이번 임기에 파산·탄핵으로 종료되었는지. */
  gameOver: { reason: string; turn: number } | null;
}

export interface TurnSummary {
  turn: number;
  gdpGrowth: number;
  inflationDelta: number;
  unemploymentDelta: number;
  approvalDelta: number;
  balance: number;
  debtDelta: number;
  populationDelta: number;
}

export interface TurnResult {
  state: GameState;
  summary: TurnSummary;
}
