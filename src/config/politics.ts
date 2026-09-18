/**
 * 지지율은 "목표 지지율"을 계산한 뒤 smoothing 으로 접근한다.
 * 단일 요인이 지지율을 급변시키지 않도록 각 항에 개별 clamp 를 건다.
 */
export const POLITICS = {
  approval: {
    base: 50,
    smoothing: 0.28,

    growth: { weight: 2.6, reference: 1.5, clamp: 16 },
    unemployment: { weight: 2.2, clamp: 18 },
    inflation: { weight: 2.0, target: 2, tolerance: 1.5, clamp: 20 },
    /** 세부담은 국제 기준(reference) 대비 편차로 평가한다. 절대 수준으로 재면 상한에 붙어버려 세율 변화가 지지율에 반영되지 않는다. */
    tax: { weight: 0.5, reference: 41.8, clamp: 20 },
    welfare: { weight: 1.3, clamp: 12 },
    healthcare: { weight: 1.1, clamp: 8 },
    security: { weight: 1.4, clamp: 6 },
    debt: { threshold: 90, weight: 0.08, clamp: 12 },
    war: { perWar: 6, exhaustionWeight: 0.25, clamp: 25 },
    /** 임기가 길어질수록 지지율이 자연 감소한다. */
    incumbencyPerYear: 0.6,
    incumbencyClamp: 8,
  },

  stability: {
    smoothing: 0.2,
    base: 55,
    approvalWeight: 0.35,
    securityWeight: 2.2,
    welfareWeight: 0.8,
    unemploymentWeight: 1.1,
    inflationWeight: 0.7,
    inflationTolerance: 4,
    warWeight: 5,
  },

  /** 게임오버 판정. */
  collapse: {
    approvalThreshold: 8,
    /** 위 임계치 아래로 연속 유지되면 종료되는 분기 수. */
    approvalQuarters: 6,
    debtToGdpThreshold: 350,
  },
} as const;
