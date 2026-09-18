/**
 * 국가별 구조 상수(calibration).
 *
 * 시뮬레이션의 모든 목표치 함수는 `f(정책·상태) + offset` 형태이며,
 * offset 은 게임 시작 시 "초기 상태가 균형점이 되도록" 역산된다.
 * 덕분에 8개국이 서로 다른 출발점을 가지면서도, 게임이 시작되자마자
 * 제멋대로 흘러가지 않고 플레이어의 정책 변화에만 반응한다.
 */
export interface Calibration {
  /** 생산성 목표 보정. 초기 추세성장률을 만들어내는 갭을 포함한다. */
  productivity: number;
  competitiveness: number;
  /** 수요 충격 합계를 초기 시점에 0 으로 만드는 보정(%p). */
  growth: number;
  inflation: number;
  unemployment: number;
  fertility: number;
  mortality: number;
  lifeExpectancy: number;
  migration: number;
  education: number;
  exportShare: number;
  importShare: number;
  /** GDP 대비 세외수입 보정(%). 초기 재정수지를 목표치에 맞춘다. */
  revenue: number;
  /** 테일러 준칙의 중립금리 보정(%p). */
  taylor: number;
  approval: number;
  stability: number;
  propensityConsumption: number;
  propensityInvestment: number;
  militaryTech: number;
  troops: number;
}
