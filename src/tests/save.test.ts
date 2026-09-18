import { describe, expect, it } from 'vitest';
import { createGame } from '@/simulation/state/createGame';
import { advanceTurn } from '@/simulation/engine';
import { parseSave, serializeSave } from '@/lib/save/schema';
import { SAVE_VERSION } from '@/types/save';

describe('저장 데이터 검증', () => {
  it('직렬화한 게임을 그대로 복원할 수 있다', () => {
    // Arrange
    const state = advanceTurn(createGame({ playerCountry: 'JPN', seed: 'SAVE' })).state;

    // Act
    const parsed = parseSave(serializeSave(state, '테스트'));

    // Assert
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.save.version).toBe(SAVE_VERSION);
    expect(parsed.save.state.nations.JPN.economy.gdp).toBeCloseTo(state.nations.JPN.economy.gdp, 8);
  });

  it('복원한 상태로 이어서 진행해도 결과가 같다', () => {
    // Arrange
    const original = advanceTurn(createGame({ playerCountry: 'DEU', seed: 'RESUME' })).state;
    const parsed = parseSave(serializeSave(original, 'r'));
    if (!parsed.ok) throw new Error('저장 복원 실패');

    // Act
    const direct = advanceTurn(original).state.nations.DEU.economy.gdp;
    const restored = advanceTurn(parsed.save.state).state.nations.DEU.economy.gdp;

    // Assert
    expect(restored).toBeCloseTo(direct, 10);
  });

  it('JSON 이 아니면 안전하게 실패한다', () => {
    // Arrange & Act
    const result = parseSave('{ 이건 JSON 이 아님');

    // Assert
    expect(result.ok).toBe(false);
  });

  it('스키마에 맞지 않는 값은 거부한다', () => {
    // Arrange
    const state = createGame({ playerCountry: 'KOR', seed: 'INVALID' });
    const raw = JSON.parse(serializeSave(state, 'x'));
    raw.state.nations.KOR.politics.approval = 5000;

    // Act
    const result = parseSave(JSON.stringify(raw));

    // Assert
    expect(result.ok).toBe(false);
  });

  it('NaN 이나 Infinity 가 섞이면 거부한다', () => {
    // Arrange
    const state = createGame({ playerCountry: 'KOR', seed: 'NAN' });
    const raw = JSON.parse(serializeSave(state, 'x'));
    raw.state.nations.KOR.economy.gdp = null;

    // Act
    const result = parseSave(JSON.stringify(raw));

    // Assert
    expect(result.ok).toBe(false);
  });

  it('지원하지 않는 버전은 거부한다', () => {
    // Arrange
    const state = createGame({ playerCountry: 'KOR', seed: 'VERSION' });
    const raw = JSON.parse(serializeSave(state, 'x'));
    raw.version = SAVE_VERSION + 5;

    // Act
    const result = parseSave(JSON.stringify(raw));

    // Assert
    expect(result.ok).toBe(false);
  });
});
