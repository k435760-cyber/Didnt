import { describe, expect, it } from 'vitest';
import { createRng, deriveRng, generateSeed, hashString } from '@/simulation/rng';

describe('seed 기반 난수', () => {
  it('같은 seed 는 같은 수열을 만든다', () => {
    // Arrange
    const a = createRng(hashString('SEED'));
    const b = createRng(hashString('SEED'));

    // Act
    const left = Array.from({ length: 50 }, () => a.next());
    const right = Array.from({ length: 50 }, () => b.next());

    // Assert
    expect(left).toEqual(right);
  });

  it('다른 seed 는 다른 수열을 만든다', () => {
    // Arrange
    const a = createRng(hashString('SEED-A'));
    const b = createRng(hashString('SEED-B'));

    // Act
    const left = Array.from({ length: 20 }, () => a.next());
    const right = Array.from({ length: 20 }, () => b.next());

    // Assert
    expect(left).not.toEqual(right);
  });

  it('채널이 다르면 서로 독립적인 스트림이 된다', () => {
    // Arrange & Act
    const event = deriveRng('SEED', 3, 'event', 'KOR');
    const diplomacy = deriveRng('SEED', 3, 'diplomacy', 'KOR');

    // Assert
    expect(event.next()).not.toBe(diplomacy.next());
  });

  it('같은 채널을 다시 파생하면 같은 값이 나온다', () => {
    // Arrange & Act
    const first = deriveRng('SEED', 7, 'event', 'USA').next();
    const second = deriveRng('SEED', 7, 'event', 'USA').next();

    // Assert
    expect(first).toBe(second);
  });

  it('난수 출력은 항상 [0, 1) 범위 안에 있다', () => {
    // Arrange
    const rng = createRng(hashString('RANGE'));

    // Act
    const values = Array.from({ length: 2000 }, () => rng.next());

    // Assert
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('가중치 선택은 가중치가 0 인 항목을 고르지 않는다', () => {
    // Arrange
    const rng = createRng(hashString('WEIGHTED'));
    const items = [
      { id: 'a', weight: 0 },
      { id: 'b', weight: 5 },
    ];

    // Act
    const picks = Array.from({ length: 200 }, () => rng.weighted(items, (i) => i.weight)?.id);

    // Assert
    expect(picks.every((id) => id === 'b')).toBe(true);
  });

  it('생성된 seed 는 고정 길이 문자열이다', () => {
    // Arrange
    let counter = 0;
    const source = () => (counter += 0.137) % 1;

    // Act
    const seed = generateSeed(source);

    // Assert
    expect(seed).toHaveLength(10);
    expect(seed).toMatch(/^[A-Z2-9]+$/);
  });
});
