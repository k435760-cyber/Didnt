/** 화면 표기용 포맷터. 시뮬레이션 로직과 분리되어 있다. */

const numberFormat = new Intl.NumberFormat('ko-KR');

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * 시뮬레이션 내부 금액 단위는 10억 USD 이다.
 * 1,000 (= 1조 USD) 이상은 '조 달러', 그 아래는 '억 달러'(= 값 × 10)로 표기한다.
 */
export function formatMoney(billionUsd: number): string {
  if (!Number.isFinite(billionUsd)) return '—';
  if (Math.abs(billionUsd) >= 1000) return `${formatNumber(billionUsd / 1000, 2)}조 달러`;
  return `${formatNumber(billionUsd * 10, 0)}억 달러`;
}

/** 지표 타일처럼 좁은 자리에 쓰는 축약 표기. */
export function formatCompactMoney(billionUsd: number): string {
  if (!Number.isFinite(billionUsd)) return '—';
  if (Math.abs(billionUsd) >= 1000) return `${formatNumber(billionUsd / 1000, 2)}조`;
  return `${formatNumber(billionUsd * 10, 0)}억`;
}

/**
 * 차트 축 표기.
 * 눈금 간격이 좁을 때 값이 전부 같아 보이지 않도록 조 단위는 소수 둘째 자리까지 쓴다.
 */
export function formatAxisMoney(billionUsd: number): string {
  if (!Number.isFinite(billionUsd)) return '—';
  if (Math.abs(billionUsd) >= 1000) return `${formatNumber(billionUsd / 1000, 2)}조`;
  return `${formatNumber(billionUsd * 10, 0)}억`;
}

/** 1인당 GDP(USD)를 만 달러 단위로 줄여 쓴다. */
export function formatAxisPerCapita(usd: number): string {
  if (!Number.isFinite(usd)) return '—';
  return `${formatNumber(usd / 10000, 1)}만`;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatNumber(value, digits)}%`;
}

export function formatSigned(value: number, digits = 1, suffix = '%p'): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, digits)}${suffix}`;
}

export function formatPopulation(people: number): string {
  if (!Number.isFinite(people)) return '—';
  if (people >= 100_000_000) return `${formatNumber(people / 100_000_000, 2)}억 명`;
  return `${formatNumber(people / 10_000, 0)}만 명`;
}

export function formatPerCapita(usd: number): string {
  if (!Number.isFinite(usd)) return '—';
  return `${numberFormat.format(Math.round(usd))} USD`;
}

export function formatPeriod(year: number, quarter: number): string {
  return `${year}년 ${quarter}분기`;
}

/**
 * 집권 기간 표기. '집권 4년 0분기'처럼 어색하고 긴 문자열 대신
 * 좁은 화면에서도 잘리지 않는 'N년차'로 쓴다.
 */
export function formatTenure(quarters: number): string {
  if (!Number.isFinite(quarters) || quarters < 0) return '집권 1년차';
  return `집권 ${Math.floor(quarters / 4) + 1}년차`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
