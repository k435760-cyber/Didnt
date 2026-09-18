/**
 * 모든 금액은 10억 USD 단위이며, 유량(소비·투자·수출 등)은 연율(annualised) 기준이다.
 * 한 턴은 1분기이므로 실제 분기 유량은 `값 / 4` 이다.
 */
export interface EconomyState {
  gdp: number;
  /** 직전 분기 대비 성장률을 연율로 환산한 값(%). */
  gdpGrowth: number;
  /** 생산성·노동력으로만 결정되는 잠재성장률(%). */
  potentialGrowth: number;
  consumption: number;
  investment: number;
  governmentSpending: number;
  exports: number;
  imports: number;
  /** 연율 소비자물가 상승률(%). */
  inflation: number;
  /** 실업률(%). */
  unemployment: number;
  /** 중앙은행 기준금리(%). */
  policyRate: number;
  /** 노동생산성 지수. 100 = 게임 기준선. */
  productivity: number;
  /** 산업 경쟁력 0~100. 수출과 투자에 영향을 준다. */
  competitiveness: number;
  /** 에너지 수입 의존도 0~100. 원자재 충격의 크기를 결정한다. */
  energyDependence: number;
  /** 누적 물가지수. 실질 지표 환산에 쓴다. 시작 시점 100. */
  priceIndex: number;
}

export interface TradeResult {
  exports: number;
  imports: number;
  balance: number;
}
