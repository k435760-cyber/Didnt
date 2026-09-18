/** 시뮬레이션 전역에서 쓰는 수치 유틸. 모든 함수는 순수 함수다. */

/** NaN·Infinity 를 fallback 으로 대체한다. 모든 계산 결과는 이 함수를 통과시킨다. */
export function safe(value: number | undefined | null, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number | undefined | null, min: number, max: number): number {
  const v = safe(value, min);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

/** 백분율 지표 전용 clamp. */
export function clampPercent(value: number | undefined | null): number {
  return clamp(value, 0, 100);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp(t, 0, 1);
}

/** 현재값을 목표값 쪽으로 speed 비율만큼 이동시킨다. */
export function approach(current: number, target: number, speed: number): number {
  return safe(current) + (safe(target) - safe(current)) * clamp(speed, 0, 1);
}

/** 절댓값 상한을 건다. 단일 요인이 지표를 과도하게 흔드는 것을 막는다. */
export function limit(value: number, magnitude: number): number {
  return clamp(value, -Math.abs(magnitude), Math.abs(magnitude));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(safe(value) * factor) / factor;
}

/** 0 에서 안전한 로그. 규모 효과를 줄일 때 쓴다. */
export function logScale(value: number, reference: number): number {
  const v = Math.max(value, 1e-6);
  const r = Math.max(reference, 1e-6);
  return Math.log(v / r);
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + safe(v), 0);
}

/** 연율 성장률(%)을 분기 성장 배수로 변환한다. */
export function annualRateToQuarterFactor(annualPercent: number): number {
  return 1 + safe(annualPercent) / 100 / 4;
}

/** 분기 변화율을 연율(%)로 환산한다. */
export function quarterChangeToAnnualPercent(previous: number, current: number): number {
  if (previous <= 0) return 0;
  return safe((current / previous - 1) * 4 * 100);
}
