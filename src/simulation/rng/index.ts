/**
 * seed 기반 결정적 난수.
 *
 * `deriveRng` 는 (seed, 채널 이름들) 으로 독립 스트림을 만든다.
 * 호출 순서가 바뀌어도 서로 영향을 주지 않으므로, 시뮬레이션 단계가 늘어나도
 * 기존 세이브의 재현성이 깨지지 않는다.
 */

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [min, max] 정수 */
  int(min: number, max: number): number;
  /** [min, max) 실수 */
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** 가중치 기반 선택. 가중치 합이 0 이면 null. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | null;
  chance(probability: number): boolean;
}

/** FNV-1a 32bit 해시. 문자열 seed 를 정수로 바꾼다. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: 작고 빠르며 주기가 충분한 PRNG. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seedValue: number): Rng {
  const next = mulberry32(seedValue);

  const rng: Rng = {
    next,
    int(min, max) {
      if (max <= min) return min;
      return min + Math.floor(next() * (max - min + 1));
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error('pick() 은 비어있지 않은 배열을 요구합니다.');
      }
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    weighted(items, weight) {
      let total = 0;
      for (const item of items) {
        const w = weight(item);
        if (w > 0) total += w;
      }
      if (total <= 0) return null;

      let roll = next() * total;
      for (const item of items) {
        const w = weight(item);
        if (w <= 0) continue;
        roll -= w;
        if (roll <= 0) return item;
      }
      return items[items.length - 1] ?? null;
    },
    chance(probability) {
      return next() < probability;
    },
  };

  return rng;
}

/** seed 와 채널로부터 독립적인 난수 스트림을 만든다. */
export function deriveRng(seed: string, ...channel: readonly (string | number)[]): Rng {
  return createRng(hashString(`${seed}|${channel.join('|')}`));
}

/** 새 게임용 seed 문자열 생성. 외부에서 주입 가능하도록 randomSource 를 받는다. */
export function generateSeed(randomSource: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(randomSource() * alphabet.length)] ?? 'A';
  }
  return out;
}
