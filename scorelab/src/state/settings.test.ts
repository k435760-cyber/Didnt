import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('서버에서 내려온 설정 거르기', () => {
  it('아는 키만, 타입이 맞을 때만 받는다', () => {
    expect(sanitizeSettings({ theme: 'dark', gradient: false, showSteps: 'yes', hack: 1 })).toEqual(
      { theme: 'dark', gradient: false },
    );
  });

  it('모르는 테마는 버린다', () => {
    expect(sanitizeSettings({ theme: 'neon' })).toEqual({});
  });

  it('객체가 아니면 아무것도 받지 않는다', () => {
    for (const raw of [null, undefined, 'dark', 42, ['dark']]) {
      expect(sanitizeSettings(raw)).toEqual({});
    }
  });

  it('기본 설정을 통째로 넣으면 그대로 돌아온다', () => {
    expect(sanitizeSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });
});
