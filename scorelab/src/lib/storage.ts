/**
 * 로컬 저장. 저장이 막힌 브라우저(사생활 보호 모드, 용량 초과)에서도
 * 앱이 죽지 않고 "저장 실패" 를 알릴 수 있도록 결과를 값으로 돌려준다.
 */
import type { Workspace } from './engine';
import { emptyWorkspace } from './engine';
import { ImportError, parseWorkspace, serialize } from './serialize';

export const KEYS = {
  workspace: 'scorelab.workspace.v2',
  settings: 'scorelab.settings.v1',
  backup: 'scorelab.corrupt-backup.v2',
} as const;

export type LoadResult =
  | { status: 'loaded'; workspace: Workspace }
  | { status: 'empty'; workspace: Workspace }
  | { status: 'corrupt'; workspace: Workspace; message: string; raw: string };

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadWorkspace(): LoadResult {
  const raw = safeGet(KEYS.workspace);
  if (!raw) return { status: 'empty', workspace: emptyWorkspace() };
  try {
    return { status: 'loaded', workspace: parseWorkspace(raw) };
  } catch (error) {
    // 손상된 원본은 지우지 않고 따로 옮겨 둔다. 사용자가 내려받아 살릴 수 있게.
    safeSet(KEYS.backup, raw);
    const message =
      error instanceof ImportError ? error.message : '저장된 데이터를 읽을 수 없습니다.';
    return { status: 'corrupt', workspace: emptyWorkspace(), message, raw };
  }
}

export function saveWorkspace(workspace: Workspace): boolean {
  try {
    return safeSet(KEYS.workspace, serialize(workspace));
  } catch {
    return false;
  }
}

export const readBackup = () => safeGet(KEYS.backup);

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(KEYS.workspace);
  } catch {
    /* 저장소가 막혀 있으면 지울 것도 없다 */
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  const raw = safeGet(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? { ...fallback, ...(parsed as object) } : fallback;
  } catch {
    return fallback;
  }
}

export const saveJson = (key: string, value: unknown): boolean => {
  try {
    return safeSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
};
