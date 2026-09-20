import { describe, expect, it } from 'vitest';
import { Q, ZERO, HUNDRED } from './rational';

describe('Q', () => {
  it('십진 문자열을 오차 없이 보관한다', () => {
    const tenth = Q.of('0.1');
    expect(tenth.n).toBe(1n);
    expect(tenth.d).toBe(10n);
    // 부동소수점이라면 0.30000000000000004 가 되는 계산
    expect(tenth.add(Q.of('0.2')).eq(Q.of('0.3'))).toBe(true);
  });

  it('0.1 을 세 번 더해도 정확히 0.3 이다', () => {
    const sum = Q.of('0.1').add(Q.of('0.1')).add(Q.of('0.1'));
    expect(sum.toFixed(20)).toBe('0.' + '3'.repeat(20).slice(0, 1) + '0'.repeat(19));
  });

  it('숫자와 문자열 입력이 같은 값을 만든다', () => {
    expect(Q.of(12.5).eq(Q.of('12.5'))).toBe(true);
    expect(Q.of(1e-7).eq(Q.of('0.0000001'))).toBe(true);
  });

  it('잘못된 입력은 parse 에서 null 이다', () => {
    expect(Q.parse('abc')).toBeNull();
    expect(Q.parse('')).toBeNull();
    expect(Q.parse('1.2.3')).toBeNull();
    expect(Q.parse('12')?.toDecimal()).toBe('12');
  });

  it('0 으로 나누면 던진다', () => {
    expect(() => Q.of(1).div(ZERO)).toThrow();
    expect(() => new Q(1n, 0n)).toThrow();
  });

  it('비교는 통분해서 정확히 한다', () => {
    expect(Q.of('89.995').lt(Q.of(90))).toBe(true);
    expect(Q.of('89.995').toFixed(2)).toBe('90.00'); // 표시는 반올림되지만
    expect(Q.of('89.995').gte(Q.of(90))).toBe(false); // 판정은 원값으로
  });

  it('올림/내림은 음수에서도 수학적 정의를 따른다', () => {
    expect(Q.of('-1.5').floor().toDecimal()).toBe('-2');
    expect(Q.of('-1.5').ceil().toDecimal()).toBe('-1');
    expect(Q.of('1.5').floor().toDecimal()).toBe('1');
    expect(Q.of('1.5').ceil().toDecimal()).toBe('2');
  });

  it('step 올림은 배수 위로 맞춘다', () => {
    expect(Q.of('17.2').ceilToStep(Q.of('0.5')).toDecimal()).toBe('17.5');
    expect(Q.of('17.5').ceilToStep(Q.of('0.5')).toDecimal()).toBe('17.5');
    expect(Q.of('17.2').floorToStep(Q.of('0.5')).toDecimal()).toBe('17');
    expect(Q.of('3').ceilToStep(ZERO).toDecimal()).toBe('3');
  });

  it('배수 판정은 유리수로 한다', () => {
    expect(Q.of('0.3').isMultipleOf(Q.of('0.1'))).toBe(true);
    expect(Q.of('0.35').isMultipleOf(Q.of('0.1'))).toBe(false);
    expect(Q.of('18.5').isMultipleOf(Q.of('0.5'))).toBe(true);
  });

  it('toFixed 는 half-up 이고 Number 를 거치지 않는다', () => {
    expect(Q.of('0.005').toFixed(2)).toBe('0.01'); // Number(0.005).toFixed(2) === '0.01' 또는 '0.00' 환경차 없음
    expect(Q.of('2.675').toFixed(2)).toBe('2.68'); // 부동소수점이면 2.67
    expect(new Q(1n, 3n).toFixed(4)).toBe('0.3333');
    expect(new Q(2n, 3n).toFixed(4)).toBe('0.6667');
  });

  it('toDecimal 은 꼬리 0 을 없앤다', () => {
    expect(Q.of('90.00').toDecimal()).toBe('90');
    expect(Q.of('90.50').toDecimal()).toBe('90.5');
    expect(HUNDRED.toDecimal()).toBe('100');
  });

  it('clamp 는 범위 안으로 가둔다', () => {
    expect(Q.of(120).clamp(ZERO, HUNDRED).eq(HUNDRED)).toBe(true);
    expect(Q.of(-3).clamp(ZERO, HUNDRED).isZero()).toBe(true);
  });
});
