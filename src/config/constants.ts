/** 게임 전역 상수. 밸런스 계수는 도메인별 config 파일에 둔다. */

export const TURNS_PER_YEAR = 4;

export const GAME_START_YEAR = 2026;

/** 차트/통계에 보관하는 최대 분기 수(40년). 그 이상은 앞에서부터 버린다. */
export const MAX_HISTORY_POINTS = 160;

/** 뉴스 피드 보관 개수. */
export const MAX_NEWS_ITEMS = 120;

/** 이벤트 기록 보관 개수. */
export const MAX_EVENT_HISTORY = 80;

/** 모든 비율 지표의 하한/상한. NaN·Infinity 방어와 함께 쓴다. */
export const PERCENT_MIN = 0;
export const PERCENT_MAX = 100;

/** GDP 는 절대 0 이하로 내려가지 않는다. */
export const MIN_GDP = 1;

/** 인구 하한(명). */
export const MIN_POPULATION = 100_000;

export const GROWTH_MIN = -18;
export const GROWTH_MAX = 18;

export const INFLATION_MIN = -6;
export const INFLATION_MAX = 45;

export const UNEMPLOYMENT_MIN = 1.5;
export const UNEMPLOYMENT_MAX = 40;

export const POLICY_RATE_MIN = 0;
export const POLICY_RATE_MAX = 20;

export const RELATION_MIN = -100;
export const RELATION_MAX = 100;
