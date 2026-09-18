import type { GameState, SaveSlot } from '@/types';
import { parseSave, serializeSave } from './schema';

const PREFIX = 'statecraft';

export interface SaveMeta {
  slot: SaveSlot;
  label: string;
  savedAt: string;
  turn: number;
  country: string;
}

/** 로그인 사용자별로 저장 슬롯을 분리한다. 비로그인 시 'local' 네임스페이스를 쓴다. */
function key(slot: SaveSlot, namespace: string): string {
  return `${PREFIX}:${namespace}:${slot}`;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function writeSave(
  state: GameState,
  slot: SaveSlot,
  namespace: string,
  label: string,
): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key(slot, namespace), serializeSave(state, label));
    return true;
  } catch {
    return false;
  }
}

export type LoadResult =
  { ok: true; state: GameState; meta: SaveMeta } | { ok: false; error: string };

export function readSave(slot: SaveSlot, namespace: string): LoadResult {
  const store = storage();
  if (!store) return { ok: false, error: '이 환경에서는 저장소를 사용할 수 없습니다.' };

  const raw = store.getItem(key(slot, namespace));
  if (!raw) return { ok: false, error: '저장된 게임이 없습니다.' };

  const parsed = parseSave(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return {
    ok: true,
    state: parsed.save.state,
    meta: {
      slot,
      label: parsed.save.label,
      savedAt: parsed.save.savedAt,
      turn: parsed.save.state.turn,
      country: parsed.save.state.nations[parsed.save.state.playerCountry].name,
    },
  };
}

export function peekSave(slot: SaveSlot, namespace: string): SaveMeta | null {
  const result = readSave(slot, namespace);
  return result.ok ? result.meta : null;
}

export function clearSave(slot: SaveSlot, namespace: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key(slot, namespace));
  } catch {
    // 저장소 접근 실패는 게임 진행에 영향을 주지 않는다.
  }
}

export function clearAll(namespace: string): void {
  clearSave('manual', namespace);
  clearSave('auto', namespace);
}
