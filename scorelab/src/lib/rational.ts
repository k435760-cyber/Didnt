/**
 * 정확한 유리수 연산.
 *
 * 점수 계산은 "0.1 점 차이로 등급이 갈리는" 도메인이라 부동소수점을 쓸 수 없다.
 * 모든 값은 BigInt 분자/분모로 보관하고, 비교·반올림·역산 어디에도 epsilon 이 개입하지 않는다.
 * 표시할 때만 십진수로 바꾼다.
 */

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x;
};

const pow10 = (e: number): bigint => 10n ** BigInt(e);

export class Q {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new RangeError('분모가 0인 유리수는 만들 수 없습니다.');
    const sign = d < 0n ? -1n : 1n;
    const g = gcd(n, d) || 1n;
    this.n = (n / g) * sign;
    this.d = (d < 0n ? -d : d) / g;
  }

  /** 십진 문자열/숫자를 오차 없이 유리수로 바꾼다. `"0.1"` 은 정확히 1/10 이 된다. */
  static of(value: string | number | bigint | Q): Q {
    if (value instanceof Q) return value;
    if (typeof value === 'bigint') return new Q(value);
    const raw = typeof value === 'number' ? numberToDecimalString(value) : value.trim();
    const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(raw);
    if (!m || (m[2] === '' && (m[3] ?? '') === '')) {
      throw new SyntaxError(`십진수로 해석할 수 없습니다: ${JSON.stringify(raw)}`);
    }
    const [, sign = '', int = '', frac = ''] = m;
    const digits = `${int}${frac}` || '0';
    return new Q(BigInt(`${sign === '-' ? '-' : ''}${digits}`), pow10(frac.length));
  }

  /** 문자열이 유효한 십진수면 Q, 아니면 null. 사용자 입력 검증용. */
  static parse(value: string): Q | null {
    try {
      return Q.of(value);
    } catch {
      return null;
    }
  }

  add(o: Q): Q {
    return new Q(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Q): Q {
    return new Q(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Q): Q {
    return new Q(this.n * o.n, this.d * o.d);
  }
  div(o: Q): Q {
    if (o.n === 0n) throw new RangeError('0 으로 나눌 수 없습니다.');
    return new Q(this.n * o.d, this.d * o.n);
  }
  neg(): Q {
    return new Q(-this.n, this.d);
  }
  abs(): Q {
    return this.n < 0n ? this.neg() : this;
  }

  /** -1 | 0 | 1 */
  cmp(o: Q): -1 | 0 | 1 {
    const diff = this.n * o.d - o.n * this.d;
    return diff < 0n ? -1 : diff > 0n ? 1 : 0;
  }
  eq(o: Q) {
    return this.cmp(o) === 0;
  }
  lt(o: Q) {
    return this.cmp(o) < 0;
  }
  lte(o: Q) {
    return this.cmp(o) <= 0;
  }
  gt(o: Q) {
    return this.cmp(o) > 0;
  }
  gte(o: Q) {
    return this.cmp(o) >= 0;
  }
  isZero() {
    return this.n === 0n;
  }
  isInteger() {
    return this.d === 1n;
  }

  static min(a: Q, b: Q) {
    return a.lte(b) ? a : b;
  }
  static max(a: Q, b: Q) {
    return a.gte(b) ? a : b;
  }

  clamp(lo: Q, hi: Q): Q {
    return Q.min(Q.max(this, lo), hi);
  }

  floor(): Q {
    const q = this.n / this.d;
    return new Q(this.n < 0n && q * this.d !== this.n ? q - 1n : q);
  }
  ceil(): Q {
    const q = this.n / this.d;
    return new Q(this.n > 0n && q * this.d !== this.n ? q + 1n : q);
  }

  /** step 의 배수 중 이 값 이상인 가장 작은 값. step 이 0 이면 그대로. */
  ceilToStep(step: Q): Q {
    if (step.isZero()) return this;
    return this.div(step).ceil().mul(step);
  }
  /** step 의 배수 중 이 값 이하인 가장 큰 값. */
  floorToStep(step: Q): Q {
    if (step.isZero()) return this;
    return this.div(step).floor().mul(step);
  }
  /** 이 값이 step 의 배수인가. */
  isMultipleOf(step: Q): boolean {
    if (step.isZero()) return this.isZero();
    return this.div(step).isInteger();
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  /**
   * 소수점 `places` 자리까지 **버림 없이 반올림(half-up)** 한 십진 문자열.
   * Number 를 거치지 않으므로 0.005 같은 경계값도 정확하다.
   */
  toFixed(places = 2): string {
    const scale = pow10(places);
    const scaled = this.n * scale;
    const neg = scaled < 0n;
    const a = neg ? -scaled : scaled;
    // half-up
    let q = a / this.d;
    if ((a % this.d) * 2n >= this.d) q += 1n;
    const s = q.toString().padStart(places + 1, '0');
    const int = s.slice(0, s.length - places) || '0';
    const frac = places ? `.${s.slice(s.length - places)}` : '';
    return `${neg && q !== 0n ? '-' : ''}${int}${frac}`;
  }

  /** 꼬리 0 을 뗀 표시용 문자열. 1/3 처럼 무한소수면 places 자리에서 끊는다. */
  toDecimal(places = 2): string {
    const s = this.toFixed(places);
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
  }

  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }

  toJSON(): string {
    return this.toDecimal(10);
  }
}

/** number 를 지수표기 없이 십진 문자열로. (1e-7 → "0.0000001") */
function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError('유한한 숫자가 아닙니다.');
  if (Number.isInteger(value) && Math.abs(value) < 1e21) return value.toFixed(0);
  const s = String(value);
  if (!s.includes('e') && !s.includes('E')) return s;
  // 지수 표기 해제
  const [mantissa = '0', expPart = '0'] = s.split(/[eE]/);
  const exp = Number(expPart);
  const neg = mantissa.startsWith('-');
  const [int = '0', frac = ''] = mantissa.replace('-', '').split('.');
  const digits = int + frac;
  const point = int.length + exp;
  let out: string;
  if (point <= 0) out = `0.${'0'.repeat(-point)}${digits}`;
  else if (point >= digits.length) out = digits + '0'.repeat(point - digits.length);
  else out = `${digits.slice(0, point)}.${digits.slice(point)}`;
  return (neg ? '-' : '') + out;
}

export const ZERO = Q.of(0);
export const ONE = Q.of(1);
export const HUNDRED = Q.of(100);
