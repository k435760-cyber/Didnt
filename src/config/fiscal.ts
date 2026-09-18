import type { BudgetCategory } from '@/types/fiscal';

export const FISCAL = {
  /** 세원(GDP 대비 비중). */
  base: {
    /** 노동소득 비중. 소득세 과세표준. */
    labourShare: 0.5,
    /** 기업이익 비중. 법인세 과세표준. */
    profitShare: 0.14,
    /** 세외수입(GDP 대비). */
    nonTaxRevenue: 0.032,
  },

  /**
   * 세율이 높아질수록 징수 효율이 떨어진다(탈세·경제활동 축소).
   * effective = rate × (1 - lafferCurvature × rate²), rate 는 0~1.
   */
  lafferCurvature: 0.85,

  /** 경기 자동안정화 지출: 실업률이 기준을 넘는 1%p 당 GDP 대비 지출 비율. */
  stabilizer: {
    unemploymentThreshold: 4,
    weightPerPoint: 0.0022,
    /** 복지예산이 클수록 자동안정화 지출도 커진다. */
    welfareCoupling: 0.12,
  },

  /** 국채 조달금리 = 기준금리×passThrough + spread + 부채 위험프리미엄. */
  interest: {
    policyRatePassThrough: 0.65,
    baseSpread: 1.0,
    riskThreshold: 60,
    riskWeight: 0.012,
    /** 정치 불안은 조달금리를 올린다. */
    stabilityWeight: 0.02,
    stabilityReference: 60,
    max: 18,
  },

  /** 예산 항목별 조정 한계(GDP 대비 %). */
  budgetLimits: {
    min: 0,
    max: 20,
  },

  /** 세율 조정 한계(%). */
  taxLimits: {
    income: { min: 0, max: 70 },
    corporate: { min: 0, max: 60 },
    consumption: { min: 0, max: 35 },
  },

  /** 한 분기에 바꿀 수 있는 정책 변화 폭. 급격한 조작을 막는다. */
  changeLimits: {
    taxPerTurn: 6,
    budgetPerTurn: 3,
    policyRatePerTurn: 1.5,
  },
} as const;

export const BUDGET_LABELS: Record<BudgetCategory, string> = {
  welfare: '복지',
  education: '교육',
  defense: '국방',
  healthcare: '의료',
  security: '치안',
  infrastructure: '인프라',
  research: '연구개발',
  environment: '환경',
  industry: '산업지원',
};

/** 각 예산 항목이 어떤 지표에 붙는지 UI 설명과 시뮬레이션 모두에서 참조한다. */
export const BUDGET_EFFECTS: Record<BudgetCategory, { gains: string[]; costs: string[] }> = {
  welfare: {
    gains: ['지지율 상승', '소비성향 개선', '출산율 소폭 상승'],
    costs: ['재정지출 증가', '구조적 실업률 상승'],
  },
  education: {
    gains: ['교육지수 상승', '장기 생산성 상승', '구조적 실업률 하락'],
    costs: ['재정지출 증가', '효과 발현까지 수 년 소요'],
  },
  defense: {
    gains: ['군사력·준비도 상승', '외교 협상력 상승'],
    costs: ['재정지출 증가', '3% 초과 시 민간투자 구축'],
  },
  healthcare: {
    gains: ['기대수명 상승', '출산율 소폭 상승', '지지율 상승'],
    costs: ['재정지출 증가', '고령화 가속'],
  },
  security: {
    gains: ['정치 안정성 상승', '치안 관련 불안 완화'],
    costs: ['재정지출 증가', '과도하면 지지율 하락'],
  },
  infrastructure: {
    gains: ['생산성 상승', '산업 경쟁력 상승'],
    costs: ['재정지출 증가', '효과 발현이 느림'],
  },
  research: {
    gains: ['생산성 상승', '경쟁력 상승', '민간투자 유인'],
    costs: ['재정지출 증가', '단기 효과 미미'],
  },
  environment: {
    gains: ['기대수명 상승', '에너지 의존도 완화', '지지율 소폭 상승'],
    costs: ['재정지출 증가', '단기 산업 경쟁력 하락'],
  },
  industry: {
    gains: ['산업 경쟁력 상승', '수출 확대'],
    costs: ['재정지출 증가', '과도하면 재정 비효율'],
  },
};
