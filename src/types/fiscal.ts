export type BudgetCategory =
  | 'welfare'
  | 'education'
  | 'defense'
  | 'healthcare'
  | 'security'
  | 'infrastructure'
  | 'research'
  | 'environment'
  | 'industry';

export const BUDGET_CATEGORIES = [
  'welfare',
  'education',
  'defense',
  'healthcare',
  'security',
  'infrastructure',
  'research',
  'environment',
  'industry',
] as const;

/** 각 항목의 GDP 대비 지출 비율(%). */
export type BudgetAllocation = Record<BudgetCategory, number>;

export interface TaxPolicy {
  /** 소득세 실효세율(%). */
  income: number;
  /** 법인세 실효세율(%). */
  corporate: number;
  /** 소비세율(%). */
  consumption: number;
}

export interface RevenueBreakdown {
  income: number;
  corporate: number;
  consumption: number;
  other: number;
  total: number;
}

export interface ExpenditureBreakdown {
  /** 예산 항목별 지출(연율, 10억 USD). */
  programs: Record<BudgetCategory, number>;
  /** 실업급여 등 경기 자동안정화 지출. */
  stabilizers: number;
  /** 국채 이자 비용. */
  interest: number;
  total: number;
}

export interface FiscalState {
  revenue: number;
  expenditure: number;
  /** 재정수지(연율). 음수면 적자. */
  balance: number;
  /** 국가부채 잔액(10억 USD). */
  debt: number;
  /** 부채/GDP 비율(%). */
  debtToGdp: number;
  /** 국채 평균 조달금리(%). */
  interestRate: number;
}
