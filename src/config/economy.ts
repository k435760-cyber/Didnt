/**
 * 경제 엔진 계수.
 *
 * 부호 규칙: 값이 커질수록 성장률(%p)에 더해지는 방향이면 양수.
 * 대부분의 항은 "기준값 대비 편차 × 계수" 형태이며, 게임 시작 시 계산되는
 * calibration offset 이 초기 상태에서의 합을 0 으로 맞춘다.
 */
export const ECONOMY = {
  /** 세율 기준값(%). 이 값보다 높으면 성장에 마이너스로 작용한다. */
  referenceTax: { income: 25, corporate: 22, consumption: 10 },

  /** 세율 1%p 편차당 성장률(%p) 영향. */
  taxDrag: { income: 0.042, corporate: 0.058, consumption: 0.03 },

  /** 중립 실질금리(%). */
  neutralRealRate: 1.0,
  /** 실질금리 1%p 편차당 성장률(%p) 영향. */
  realRateDrag: 0.24,

  /** 정부지출 비율(GDP 대비 %) 변화 1%p 당 단기 승수. */
  fiscalMultiplier: 0.55,
  /** 정부지출 수준이 중립(GDP 대비 %)에서 벗어날 때의 구축효과 계수. */
  neutralSpendingRatio: 21,
  crowdingOut: 0.035,

  /** 물가가 목표 밴드(±2%p)를 벗어난 크기 1%p 당 성장률 영향. */
  inflationDrag: 0.11,
  inflationTolerance: 2,

  /** 정치 안정성/지지율의 성장 기여. */
  stabilityBoost: 0.013,
  stabilityReference: 60,
  approvalBoost: 0.004,
  approvalReference: 50,

  /** 실업률이 자연실업률을 웃돌 때의 성장 저해. */
  unemploymentDrag: 0.09,

  /** 산업 경쟁력의 성장 기여. */
  competitivenessBoost: 0.009,
  competitivenessReference: 60,

  /** 무역수지 비율(GDP 대비 %) 변화 1%p 당 성장 기여. */
  tradeMultiplier: 0.45,

  /** 전 분기 성장률의 관성. 0 이면 관성 없음. */
  growthMomentum: 0.22,

  /** 생산성 지수가 목표치로 수렴하는 분기별 속도. */
  productivityAdjustSpeed: 0.012,
  productivityTarget: {
    educationWeight: 0.52,
    researchWeight: 5.0,
    infrastructureWeight: 1.6,
    competitivenessWeight: 0.22,
    /** 고령인구 비율이 이 값을 넘으면 생산성 목표가 깎인다. */
    agingThreshold: 14,
    agingWeight: 0.5,
  },

  /** 산업 경쟁력이 목표로 수렴하는 속도와 결정요인. */
  competitivenessAdjustSpeed: 0.035,
  competitivenessTarget: {
    researchWeight: 4.5,
    industryWeight: 3.2,
    educationWeight: 0.18,
    /** 법인세 1%p 당 경쟁력 목표 감소. */
    corporateTaxWeight: 0.35,
    infrastructureWeight: 1.4,
  },

  /** 소비/투자 성향. remainder(= GDP - 정부지출 - 순수출)를 두 항목에 배분한다. */
  propensity: {
    consumptionBase: 62,
    investmentBase: 26,
    /** 소득세·소비세가 소비성향에 주는 영향(1%p 당). */
    incomeTaxOnConsumption: 0.35,
    consumptionTaxOnConsumption: 0.3,
    welfareOnConsumption: 0.45,
    unemploymentOnConsumption: 0.6,
    realRateOnConsumption: 0.5,
    /** 법인세·금리·R&D가 투자성향에 주는 영향. */
    corporateTaxOnInvestment: 0.55,
    realRateOnInvestment: 0.9,
    researchOnInvestment: 1.3,
    stabilityOnInvestment: 0.08,
    /** 국방비가 과도할 때의 민간투자 구축. */
    defenseCrowdingThreshold: 3.0,
    defenseCrowdingWeight: 0.9,
  },

  /** 무역. 수출입 비율(GDP 대비 %)의 결정요인. */
  trade: {
    competitivenessWeight: 0.28,
    competitivenessReference: 60,
    /** 물가가 높으면 가격경쟁력이 떨어진다. */
    inflationWeight: 0.35,
    inflationReference: 2,
    /** 무역협정 1건당 수출 비율(%p) 증가. */
    treatyBonus: 1.6,
    /** 제재 1건당 수출 비율(%p) 감소. */
    sanctionPenalty: 3.2,
    /** 수입은 내수와 에너지 가격에 반응한다. */
    domesticDemandWeight: 0.22,
    energyWeight: 0.06,
  },

  /** 물가 방정식. */
  inflationModel: {
    /** 기대인플레이션의 관성과 앵커. */
    persistence: 0.55,
    anchor: 2.0,
    /** 필립스 곡선: (자연실업률 - 실업률) 1%p 당. */
    phillips: 0.28,
    /** 수요압력: (성장률 - 잠재성장률) 1%p 당. */
    demandPull: 0.2,
    /** 기준금리가 중립금리를 웃돌 때의 물가 억제력. */
    monetary: 0.3,
    /** 소비세 인상분의 물가 전가율. */
    consumptionTaxPassThrough: 0.55,
    /** 에너지 충격 계수(에너지 의존도 100 기준). */
    energyPassThrough: 1.0,
  },

  /** 실업률 방정식. */
  unemploymentModel: {
    /** 오쿤의 법칙 계수: 성장률 갭 1%p 당 실업률 변화(%p). */
    okun: 0.34,
    /** 구조적 실업률로 수렴하는 속도. */
    driftSpeed: 0.14,
    structural: {
      base: 4.2,
      educationWeight: 0.045,
      educationReference: 60,
      competitivenessWeight: 0.03,
      competitivenessReference: 60,
      welfareWeight: 0.12,
      researchWeight: 0.35,
      /** 고령화는 노동시장 미스매치를 키운다. */
      agingWeight: 0.04,
    },
  },

  /** 통화정책(AI·자동운용 모두 동일한 테일러 준칙을 쓴다). */
  taylorRule: {
    inflationTarget: 2.0,
    inflationWeight: 1.4,
    outputWeight: 0.5,
    neutralNominalPremium: 1.0,
    /** 분기당 금리 조정 폭 상한(%p). */
    maxStep: 0.75,
  },
} as const;
