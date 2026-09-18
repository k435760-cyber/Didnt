export const MILITARY = {
  /** 종합 군사력 지수 = 병력·기술·준비도·경제력의 가중 결합. */
  power: {
    troopWeight: 0.32,
    /** 병력 정규화 기준(명). */
    troopReference: 1_000_000,
    techWeight: 0.3,
    readinessWeight: 0.18,
    /** 국방예산 절대규모(10억 USD)의 로그 기여. */
    budgetWeight: 0.2,
    budgetReference: 50,
  },

  /** 국방예산 대비 유지비. 부족하면 준비도가 떨어진다. */
  readiness: {
    /** 병력 100만 명 유지에 필요한 GDP 대비 예산(%). */
    requiredPerMillionTroops: 0.55,
    adjustSpeed: 0.12,
    min: 5,
    max: 100,
  },

  tech: {
    /** 연구개발·국방예산이 군사기술 목표를 끌어올린다. */
    researchWeight: 3.2,
    defenseWeight: 4.5,
    productivityWeight: 0.12,
    adjustSpeed: 0.02,
    min: 5,
    max: 100,
  },

  troops: {
    /** 국방예산 비율에 따라 병력 규모가 서서히 조정된다. */
    perBudgetPointPerMillionPopulation: 4200,
    adjustSpeed: 0.05,
  },

  war: {
    /** 전투력 = 군사력 × (1 + 기술보정) × 경제력 보정 × 준비도. */
    economyWeight: 0.25,
    allyContribution: 0.35,
    exhaustionPenalty: 0.5,
    /** 분기당 전선 이동 폭. */
    frontlineScale: 22,
    /** 전선이 이 값을 넘으면 전쟁 종료. */
    decisiveThreshold: 100,
    /** 분기당 전비(GDP 대비 %). */
    costShareOfGdp: 1.8,
    /** 전쟁 중 분기당 피로도 증가. */
    exhaustionPerTurn: 4.5,
    /** 전쟁 중 성장률 직접 타격(%p). */
    growthPenalty: 2.2,
    /** 패전 시 상대에게 넘어가는 GDP 비율(%). */
    reparationShareOfGdp: 4,
    /** 승전 시 지지율 보너스 / 패전 시 페널티. */
    victoryApproval: 12,
    defeatApproval: -18,
  },
} as const;
