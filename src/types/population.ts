export interface PopulationState {
  /** 총인구(명). */
  total: number;
  /** 합계출산율. */
  fertilityRate: number;
  /** 조사망률(인구 1,000명당, 연간). */
  mortalityRate: number;
  lifeExpectancy: number;
  /** 생산가능인구 비율(%). */
  workingAgeShare: number;
  /** 65세 이상 비율(%). */
  elderlyShare: number;
  /** 순이민율(인구 1,000명당, 연간). */
  migrationRate: number;
  /** 교육 수준 지수 0~100. 인적자본 축적의 결과값. */
  educationIndex: number;
}

export interface PopulationFlow {
  births: number;
  deaths: number;
  netMigration: number;
}
