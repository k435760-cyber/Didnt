/**
 * 차트 계열 색.
 * 3개 슬롯은 라이트/다크 모두에서 색각이상 분리도(Delta E) 검증을 통과한 조합이며,
 * 순서를 바꾸거나 4번째 색을 임의로 추가하지 않는다. 계열이 더 필요하면 차트를 나눈다.
 */
export const SERIES_COLORS = [
  'var(--color-series-1)',
  'var(--color-series-2)',
  'var(--color-series-3)',
] as const;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] as string;
}
