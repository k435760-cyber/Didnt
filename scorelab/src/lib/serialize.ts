/**
 * 직렬화와 검증.
 *
 * 저장·내보내기·클라우드 동기화가 모두 이 형식을 쓴다. 들어오는 데이터는
 * 남의 파일일 수도 있으므로 구조·길이·범위를 전부 확인하고, 하나라도 어긋나면
 * 통째로 거절한다. 절대 부분적으로 받아들이지 않는다 — 그래야 기존 저장본이 안전하다.
 */
import {
  LIMITS,
  SCHEMA_VERSION,
  type Category,
  type Evaluation,
  type GradeCut,
  type Status,
  type Subject,
  type Workspace,
  cutErrors,
  evaluationErrors,
  hasErrors,
  makeSubject,
  uid,
} from './engine';

const CATEGORIES: Category[] = ['written', 'performance', 'etc'];
const STATUSES: Status[] = ['confirmed', 'expected', 'missing'];

export class ImportError extends Error {
  override name = 'ImportError';
}

function fail(message: string): never {
  throw new ImportError(message);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** 저장된 숫자를 UI 가 쓰는 문자열 초안으로 되돌린다. */
const toDraft = (v: unknown): string => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') return v;
  return '';
};

export interface ExportFile {
  format: 'scorelab';
  version: typeof SCHEMA_VERSION;
  exportedAt: string;
  activeId: string;
  subjects: unknown[];
}

/** 워크스페이스를 사람이 읽을 수 있는 JSON 으로. 점수는 숫자, 미입력은 null. */
export function serialize(workspace: Workspace, exportedAt = new Date().toISOString()): string {
  const payload: ExportFile = {
    format: 'scorelab',
    version: SCHEMA_VERSION,
    exportedAt,
    activeId: workspace.activeId,
    subjects: workspace.subjects.map(serializeSubject),
  };
  return JSON.stringify(payload, null, 2);
}

export function serializeSubject(subject: Subject) {
  return {
    id: subject.id,
    name: subject.name,
    memo: subject.memo,
    hue: subject.hue,
    target: Number(subject.target),
    sample: subject.sample,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
    cuts: subject.cuts.map((c) => ({ id: c.id, name: c.name, lower: Number(c.lower) })),
    items: subject.items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      weight: Number(i.weight),
      max: Number(i.max),
      step: Number(i.step),
      status: i.status,
      // 미입력은 null 로 저장하되, 사용자가 적어 둔 값은 따로 기억해 되살린다.
      score: i.status === 'missing' ? null : Number(i.score),
      rememberedScore: i.status === 'missing' && i.score.trim() !== '' ? Number(i.score) : null,
    })),
  };
}

export function parseSubject(raw: unknown): Subject {
  if (!isRecord(raw)) fail('과목 데이터가 객체가 아닙니다.');
  const r = raw as Record<string, unknown>;

  if (!str(r.id, 100) || !r.id) fail('과목 id 가 올바르지 않습니다.');
  if (!str(r.name, LIMITS.subjectName) || !r.name.trim()) fail('과목 이름이 올바르지 않습니다.');
  if (r.memo !== undefined && !str(r.memo, LIMITS.memo)) fail('과목 메모가 너무 깁니다.');
  if (!Array.isArray(r.items) || r.items.length > LIMITS.items)
    fail(`평가는 과목당 ${LIMITS.items}개까지입니다.`);
  if (r.cuts !== undefined && (!Array.isArray(r.cuts) || r.cuts.length > LIMITS.cuts)) {
    fail(`성취도는 ${LIMITS.cuts}개까지입니다.`);
  }

  const items: Evaluation[] = (r.items as unknown[]).map((rawItem) => {
    if (!isRecord(rawItem)) fail('평가 데이터가 객체가 아닙니다.');
    const i = rawItem as Record<string, unknown>;
    if (!str(i.id, 100) || !i.id) fail('평가 id 가 올바르지 않습니다.');
    if (!str(i.name, LIMITS.itemName)) fail('평가 이름이 올바르지 않습니다.');
    if (!CATEGORIES.includes(i.category as Category)) fail('평가 분류가 올바르지 않습니다.');
    if (!STATUSES.includes(i.status as Status)) fail('평가 상태가 올바르지 않습니다.');

    const status = i.status as Status;
    const score =
      i.score === null || i.score === undefined ? toDraft(i.rememberedScore) : toDraft(i.score);

    const item: Evaluation = {
      id: i.id,
      name: i.name,
      category: i.category as Category,
      weight: toDraft(i.weight),
      max: toDraft(i.max),
      step: toDraft(i.step) || '1',
      status,
      score,
    };
    if (hasErrors(evaluationErrors(item))) {
      fail(`"${item.name || '이름 없는 평가'}" 의 값이 허용 범위를 벗어납니다.`);
    }
    return item;
  });

  const cuts: GradeCut[] = ((r.cuts as unknown[]) ?? []).map((rawCut) => {
    if (!isRecord(rawCut)) fail('성취도 데이터가 객체가 아닙니다.');
    const c = rawCut as Record<string, unknown>;
    if (!str(c.id, 100) || !c.id) fail('성취도 id 가 올바르지 않습니다.');
    if (!str(c.name, LIMITS.cutName)) fail('성취도 이름이 올바르지 않습니다.');
    return { id: c.id, name: c.name, lower: toDraft(c.lower) };
  });
  const cutProblems = cutErrors(cuts);
  if (cutProblems.length) fail(`성취도 기준이 올바르지 않습니다: ${cutProblems[0]}`);

  const target = toDraft(r.target) || '90';
  const createdAt =
    str(r.createdAt, 40) && Number.isFinite(Date.parse(r.createdAt))
      ? r.createdAt
      : new Date().toISOString();
  const updatedAt =
    str(r.updatedAt, 40) && Number.isFinite(Date.parse(r.updatedAt)) ? r.updatedAt : createdAt;
  const hue = typeof r.hue === 'number' && Number.isInteger(r.hue) ? ((r.hue % 12) + 12) % 12 : 0;

  return makeSubject({
    id: r.id,
    name: r.name,
    memo: str(r.memo, LIMITS.memo) ? r.memo : '',
    hue,
    items,
    cuts,
    target,
    createdAt,
    updatedAt,
    sample: r.sample === true,
  });
}

export function parseWorkspace(rawText: string): Workspace {
  if (new TextEncoder().encode(rawText).length > LIMITS.fileBytes) {
    fail(`파일은 ${Math.round(LIMITS.fileBytes / 1024 / 1024)}MB 이하만 불러올 수 있습니다.`);
  }
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    return fail('JSON 형식이 아닙니다. 내보내기로 만든 파일인지 확인해 주세요.');
  }
  if (!isRecord(data)) fail('파일 내용이 올바르지 않습니다.');
  const d = data as Record<string, unknown>;
  if (d.version !== SCHEMA_VERSION)
    fail(`지원하지 않는 버전입니다. (version: ${String(d.version)})`);
  if (!Array.isArray(d.subjects)) fail('과목 목록이 없습니다.');
  if (d.subjects.length > LIMITS.subjects)
    fail(`과목은 ${LIMITS.subjects}개까지 불러올 수 있습니다.`);

  const deduped = dedupeIds(d.subjects.map(parseSubject));
  const activeId =
    typeof d.activeId === 'string' && deduped.some((s) => s.id === d.activeId)
      ? d.activeId
      : (deduped[0]?.id ?? '');

  return {
    version: SCHEMA_VERSION,
    subjects: deduped,
    activeId,
    updatedAt: new Date().toISOString(),
  };
}

/** 중복 id 는 조용히 새로 발급한다. 합치기로 들어온 파일이 기존 과목을 덮지 않게. */
export function dedupeIds(subjects: Subject[]): Subject[] {
  const seen = new Set<string>();
  const fresh = (id: string) => {
    const next = seen.has(id) ? uid() : id;
    seen.add(next);
    return next;
  };
  return subjects.map((s) => ({
    ...s,
    id: fresh(s.id),
    items: s.items.map((i) => ({ ...i, id: fresh(i.id) })),
    cuts: s.cuts.map((c) => ({ ...c, id: fresh(c.id) })),
  }));
}

export type MergeMode = 'append' | 'replace';

export function mergeWorkspace(
  current: Workspace,
  incoming: Workspace,
  mode: MergeMode,
): Workspace {
  if (mode === 'replace') return { ...incoming, updatedAt: new Date().toISOString() };
  const total = current.subjects.length + incoming.subjects.length;
  if (total > LIMITS.subjects)
    fail(`합치면 과목이 ${total}개가 되어 한도(${LIMITS.subjects})를 넘습니다.`);
  const subjects = dedupeIds([...current.subjects, ...incoming.subjects]);
  return { ...current, subjects, updatedAt: new Date().toISOString() };
}
