export const EVENTS = {
  /** 분기당 이벤트가 하나라도 발생할 기본 확률. */
  baseChance: 0.34,

  /** 직전에 이벤트가 발생했다면 확률을 낮춰 연속 발생을 억제한다. */
  consecutiveDamping: 0.45,

  /** 게임 초반에는 이벤트 발생 확률을 낮춘다. */
  warmupTurns: 2,

  /** 카테고리별 가중치 보정. */
  categoryWeight: {
    economy: 1.1,
    society: 1,
    disaster: 0.85,
    international: 0.95,
    technology: 0.8,
  },

  /** 조건을 충족했을 때 곱해지는 가중치. */
  conditionBoost: 2.4,
} as const;
