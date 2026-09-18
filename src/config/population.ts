/**
 * 인구 엔진 계수.
 * 출산율·사망률·이민율은 모두 "목표치로 서서히 수렴"하는 구조이며,
 * 목표치 함수의 상수항은 국가별 calibration 으로 초기 상태에 맞춰진다.
 */
export const POPULATION = {
  /** 목표치 수렴 속도(분기당). */
  adjustSpeed: {
    fertility: 0.035,
    mortality: 0.04,
    migration: 0.06,
    lifeExpectancy: 0.02,
    education: 0.04,
    ageStructure: 0.008,
  },

  fertilityTarget: {
    welfareWeight: 0.045,
    healthcareWeight: 0.03,
    unemploymentWeight: 0.018,
    /** 물가가 이 수준을 넘으면 양육비 부담으로 출산율이 눌린다. */
    inflationThreshold: 3,
    inflationWeight: 0.025,
    /** 고령화 자체가 출산 가능 인구를 줄인다. */
    agingThreshold: 15,
    agingWeight: 0.012,
    min: 0.4,
    max: 4.5,
  },

  mortalityTarget: {
    base: 4.2,
    agingThreshold: 10,
    agingWeight: 0.42,
    lifeExpectancyReference: 78,
    lifeExpectancyWeight: 0.18,
    min: 3,
    max: 20,
  },

  lifeExpectancyTarget: {
    base: 70,
    healthcareWeight: 1.1,
    environmentWeight: 0.8,
    educationWeight: 0.06,
    /** 1인당 GDP(천 USD) 의 로그 기여. */
    incomeWeight: 2.2,
    min: 50,
    max: 95,
  },

  migrationTarget: {
    /** 1인당 GDP(천 USD) 로그 기여. */
    incomeWeight: 1.1,
    unemploymentWeight: 0.22,
    stabilityWeight: 0.03,
    welfareWeight: 0.1,
    min: -12,
    max: 15,
  },

  educationTarget: {
    base: 30,
    /** 교육예산(GDP 대비 %) 1%p 당 교육지수 목표 상승. */
    budgetWeight: 9.0,
    /** 1인당 GDP(천 USD) 로그 기여. */
    incomeWeight: 4.5,
    min: 10,
    max: 100,
  },

  ageStructure: {
    /** 고령인구 비율 목표. */
    elderlyBase: 4,
    lifeExpectancyReference: 70,
    lifeExpectancyWeight: 0.7,
    lowFertilityReference: 2.1,
    lowFertilityWeight: 7.5,
    /** 유소년 비율 목표 = youthBase + fertility × youthWeight. */
    youthBase: 6,
    youthWeight: 5.5,
  },

  /** 조출생률 환산: CBR(1000명당) = 합계출산율 × 생산가능인구비율 × factor. */
  birthRateFactor: 12,
} as const;
