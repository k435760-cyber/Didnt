export interface PoliticsState {
  /** 국민 지지율 0~100. */
  approval: number;
  /** 정치 안정성 0~100. 투자와 성장에 영향을 준다. */
  stability: number;
  /** 임기 진행 분기 수. */
  quartersInOffice: number;
}

/** 지지율 계산을 설명 가능하게 만들기 위한 기여도 분해. */
export interface ApprovalBreakdown {
  growth: number;
  unemployment: number;
  inflation: number;
  tax: number;
  welfare: number;
  security: number;
  debt: number;
  war: number;
  incumbency: number;
  events: number;
  target: number;
}
