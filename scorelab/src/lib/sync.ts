/**
 * 클라우드 동기화.
 *
 * 기기마다 오프라인으로 편집할 수 있으니 서버를 진실의 원천으로 두지 않는다.
 * 과목 단위 "마지막 쓰기 승리(LWW)" 로 합치고, 삭제는 묘비(tombstone)로 남겨
 * 오래된 기기의 사본이 지운 과목을 되살리지 못하게 한다.
 */
import type { Subject, Workspace } from './engine';
import { LIMITS } from './engine';
import { parseSubject, serializeSubject } from './serialize';
import { supabase } from './supabase';

const TOMBSTONE_KEY = 'scorelab.tombstones.v1';

type Tombstones = Record<string, string>;

export function readTombstones(): Tombstones {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Tombstones)
      : {};
  } catch {
    return {};
  }
}

function writeTombstones(value: Tombstones) {
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(value));
  } catch {
    /* 저장소가 막혀 있으면 이번 세션 동안만 유효하다 */
  }
}

export function rememberDeletion(id: string) {
  writeTombstones({ ...readTombstones(), [id]: new Date().toISOString() });
}

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

interface SubjectRow {
  id: string;
  name: string;
  memo: string;
  hue: number;
  target: number | string;
  items: unknown[];
  cuts: unknown[];
  position: number;
  created_at: string;
  updated_at: string;
}

const toRow = (subject: Subject, userId: string, position: number) => {
  const s = serializeSubject(subject);
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    memo: s.memo,
    hue: s.hue,
    target: s.target,
    items: s.items,
    cuts: s.cuts,
    position,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
};

const fromRow = (row: SubjectRow): Subject =>
  parseSubject({
    id: row.id,
    name: row.name,
    memo: row.memo,
    hue: row.hue,
    target: Number(row.target),
    items: row.items,
    cuts: row.cuts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export interface SyncReport {
  pushed: number;
  pulled: number;
  removed: number;
  at: string;
  /** 서버 값을 읽을 수 없어 건너뛴 과목 (형식 오류 등) */
  skipped: string[];
}

export interface SyncOutcome {
  workspace: Workspace;
  report: SyncReport;
}

export class SyncError extends Error {
  override name = 'SyncError';
}

/**
 * 로컬 워크스페이스와 서버를 한 번 맞춘다. 양쪽 모두 최신 상태가 되어 돌아온다.
 */
export async function syncWorkspace(userId: string, local: Workspace): Promise<SyncOutcome> {
  const db = supabase();

  const [subjectsResult, deletionsResult] = await Promise.all([
    db.from('sl_subjects').select('*').eq('user_id', userId),
    db.from('sl_deletions').select('subject_id, deleted_at').eq('user_id', userId),
  ]);

  if (subjectsResult.error) throw new SyncError(subjectsResult.error.message);
  if (deletionsResult.error) throw new SyncError(deletionsResult.error.message);

  const skipped: string[] = [];
  const remote = new Map<string, Subject>();
  for (const row of (subjectsResult.data ?? []) as SubjectRow[]) {
    try {
      remote.set(row.id, fromRow(row));
    } catch {
      skipped.push(row.name || row.id);
    }
  }

  const remoteDeleted = new Map<string, number>(
    ((deletionsResult.data ?? []) as { subject_id: string; deleted_at: string }[]).map((d) => [
      d.subject_id,
      time(d.deleted_at),
    ]),
  );
  const localTombstones = readTombstones();

  const merged = new Map<string, Subject>();
  const toPush: Subject[] = [];
  let pulled = 0;
  let removed = 0;

  for (const subject of local.subjects) {
    const twin = remote.get(subject.id);
    if (!twin) {
      // 서버에 없다: 다른 기기가 지운 것이거나, 아직 올리지 않은 것이거나.
      const deletedAt = remoteDeleted.get(subject.id);
      if (deletedAt !== undefined && deletedAt >= time(subject.updatedAt)) {
        removed += 1;
        continue;
      }
      merged.set(subject.id, subject);
      toPush.push(subject);
      continue;
    }
    if (time(twin.updatedAt) > time(subject.updatedAt)) {
      merged.set(subject.id, twin);
      pulled += 1;
    } else {
      merged.set(subject.id, subject);
      if (time(twin.updatedAt) < time(subject.updatedAt)) toPush.push(subject);
    }
  }

  for (const [id, subject] of remote) {
    if (merged.has(id)) continue;
    const tombstone = localTombstones[id];
    if (tombstone && time(tombstone) >= time(subject.updatedAt)) continue; // 여기서 지운 것
    merged.set(id, subject);
    pulled += 1;
  }

  const pendingDeletions = Object.entries(localTombstones);
  if (pendingDeletions.length) {
    const rows = pendingDeletions.map(([subject_id, deleted_at]) => ({
      user_id: userId,
      subject_id,
      deleted_at,
    }));
    const { error } = await db
      .from('sl_deletions')
      .upsert(rows, { onConflict: 'user_id,subject_id' });
    if (error) throw new SyncError(error.message);
    const ids = pendingDeletions.map(([id]) => id).filter((id) => remote.has(id));
    if (ids.length) {
      const { error: delError } = await db
        .from('sl_subjects')
        .delete()
        .eq('user_id', userId)
        .in('id', ids);
      if (delError) throw new SyncError(delError.message);
    }
    writeTombstones({});
  }

  /*
   * 순서는 이 기기의 목록을 그대로 따른다. 예전에는 최근 수정순으로 다시 세웠는데,
   * 그러면 점수 하나만 고쳐도 과목이 맨 앞으로 튀어 올라 목록이 흔들렸다.
   * 이 기기에 없던 과목(다른 기기에서 받아온 것)만 서버의 position 순서로 뒤에 붙인다.
   */
  const localOrder = new Map(local.subjects.map((s, index) => [s.id, index]));
  const remotePosition = new Map(
    ((subjectsResult.data ?? []) as SubjectRow[]).map((row) => [row.id, row.position ?? 0]),
  );
  const subjects = [...merged.values()]
    .sort((a, b) => {
      const ai = localOrder.get(a.id);
      const bi = localOrder.get(b.id);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return (
        (remotePosition.get(a.id) ?? 0) - (remotePosition.get(b.id) ?? 0) ||
        time(b.updatedAt) - time(a.updatedAt)
      );
    })
    .slice(0, LIMITS.subjects);

  if (toPush.length) {
    const rows = toPush.map((s) =>
      toRow(
        s,
        userId,
        subjects.findIndex((x) => x.id === s.id),
      ),
    );
    const { error } = await db.from('sl_subjects').upsert(rows, { onConflict: 'id' });
    if (error) throw new SyncError(error.message);
  }

  const activeId = subjects.some((s) => s.id === local.activeId)
    ? local.activeId
    : (subjects[0]?.id ?? '');

  return {
    workspace: { ...local, subjects, activeId, updatedAt: new Date().toISOString() },
    report: { pushed: toPush.length, pulled, removed, skipped, at: new Date().toISOString() },
  };
}

/** 로그인 직후 표시 이름·설정을 올린다. 실패해도 앱 동작에는 영향이 없다. */
export async function upsertProfile(
  userId: string,
  profile: { display_name: string | null; avatar_url: string | null; prefs?: unknown },
): Promise<void> {
  const db = supabase();
  await db.from('sl_profiles').upsert(
    {
      id: userId,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      ...(profile.prefs !== undefined ? { prefs: profile.prefs } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

export async function fetchPrefs(userId: string): Promise<Record<string, unknown> | null> {
  const db = supabase();
  const { data, error } = await db
    .from('sl_profiles')
    .select('prefs')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const prefs = (data as { prefs?: unknown }).prefs;
  return prefs && typeof prefs === 'object' && !Array.isArray(prefs)
    ? (prefs as Record<string, unknown>)
    : null;
}

/** 계정의 모든 과목을 지운다. (설정 → 클라우드 데이터 삭제) */
export async function wipeCloud(userId: string): Promise<void> {
  const db = supabase();
  const { error } = await db.from('sl_subjects').delete().eq('user_id', userId);
  if (error) throw new SyncError(error.message);
  await db.from('sl_deletions').delete().eq('user_id', userId);
  writeTombstones({});
}
