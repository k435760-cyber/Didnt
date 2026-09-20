/** 표시용 서식. 계산에는 절대 쓰지 않는다. */
import { Q } from './rational';
import type { Subject } from './engine';

/** 점수를 소수 둘째 자리까지, 꼬리 0 없이. */
export const score = (value: Q, places = 2): string => value.toDecimal(places);

/**
 * 등급컷 경계에 아슬아슬하게 걸린 값은 자릿수를 늘려 보여 준다.
 * (89.999 를 "90" 으로 보여 주면 "왜 A 가 아니지?" 가 된다.)
 */
export function boundaryAware(value: Q, thresholds: Q[]): string {
  const rounded = Q.of(value.toFixed(2));
  const flips = thresholds.some((t) => value.cmp(t) !== rounded.cmp(t));
  return value.toDecimal(flips ? 6 : 2);
}

export const percent = (ratio: Q, places = 1): string => ratio.mul(Q.of(100)).toDecimal(places);

export const hueVar = (hue: number): string => `var(--hue-${((hue % 12) + 12) % 12})`;

export const subjectColor = (subject: Pick<Subject, 'hue'>): string => hueVar(subject.hue);

const RELATIVE = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });

export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.round((then - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
  ];
  let value = seconds;
  for (const [unit, span] of units) {
    if (Math.abs(value) < span) return RELATIVE.format(Math.round(value), unit);
    value /= span;
  }
  return RELATIVE.format(Math.round(value), 'year');
}

export const dateTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
    : '';
};
