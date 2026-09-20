/**
 * 점수 계산 도메인. 순수 함수만 있고 React·브라우저 API 에 의존하지 않는다.
 *
 * 모델의 숫자는 전부 문자열로 들고 있다. 사용자가 입력하던 중간 상태("0.", "")를
 * 그대로 보존해야 하기 때문이고, 계산 직전에 Q 로 바꾼다.
 */
import { Q, ZERO, HUNDRED } from './rational';

export type Category = 'written' | 'performance' | 'etc';
export type Status = 'confirmed' | 'expected' | 'missing';

export const CATEGORY_LABEL: Record<Category, string> = {
  written: '지필',
  performance: '수행',
  etc: '기타',
};

export const STATUS_LABEL: Record<Status, string> = {
  confirmed: '확정',
  expected: '예상',
  missing: '미입력',
};

export interface Evaluation {
  id: string;
  name: string;
  category: Category;
  /** 최종 성적에서 차지하는 비율(%) */
  weight: string;
  /** 이 평가의 만점 */
  max: string;
  /** 입력 가능한 점수 간격 (0.5 점 단위 등) */
  step: string;
  status: Status;
  /** 원점수. status 가 missing 이어도 직전 값을 기억해 둔다. */
  score: string;
}

export interface GradeCut {
  id: string;
  name: string;
  /** 이 성취도에 도달하는 최소 환산 점수 */
  lower: string;
}

export interface Subject {
  id: string;
  name: string;
  memo: string;
  /** 0~11 팔레트 인덱스 */
  hue: number;
  items: Evaluation[];
  target: string;
  cuts: GradeCut[];
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  version: 2;
  subjects: Subject[];
  activeId: string;
  updatedAt: string;
}

export const SCHEMA_VERSION = 2 as const;

export const LIMITS = {
  subjects: 40,
  items: 40,
  cuts: 12,
  subjectName: 30,
  itemName: 40,
  memo: 200,
  cutName: 12,
  maxValue: 100000,
  fileBytes: 2 * 1024 * 1024,
} as const;

export function uid(): string {
  const web: Crypto | undefined = typeof crypto === 'undefined' ? undefined : crypto;
  if (typeof web?.randomUUID === 'function') return web.randomUUID();
  // randomUUID 가 없는 환경(구형 브라우저, http 로 연 페이지)에서도 uuid v4 형식을 지킨다.
  // 서버의 sl_subjects.id 가 uuid 컬럼이라 형식이 어긋나면 동기화가 통째로 실패한다.
  const bytes = new Uint8Array(16);
  if (typeof web?.getRandomValues === 'function') web.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ 생성 */

export function makeEvaluation(patch: Partial<Evaluation> = {}): Evaluation {
  return {
    id: uid(),
    name: '새 평가',
    category: 'performance',
    weight: '0',
    max: '100',
    step: '1',
    status: 'missing',
    score: '',
    ...patch,
  };
}

export const DEFAULT_CUTS: Omit<GradeCut, 'id'>[] = [
  { name: 'A', lower: '90' },
  { name: 'B', lower: '80' },
  { name: 'C', lower: '70' },
  { name: 'D', lower: '60' },
  { name: 'E', lower: '0' },
];

export const makeCuts = (): GradeCut[] => DEFAULT_CUTS.map((c) => ({ ...c, id: uid() }));

export function makeSubject(patch: Partial<Subject> = {}): Subject {
  const stamp = now();
  return {
    id: uid(),
    name: '새 과목',
    memo: '',
    hue: 0,
    items: [],
    target: '90',
    cuts: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...patch,
  };
}

/**
 * 처음 열었을 때의 상태. 예시 과목을 만들어 두지 않는다 —
 * 남의 점수가 내 점수인 척 앉아 있는 것보다, 빈 화면에서 안내하는 편이 낫다.
 */
export function emptyWorkspace(): Workspace {
  return { version: SCHEMA_VERSION, subjects: [], activeId: '', updatedAt: now() };
}

export function cloneSubject(source: Subject): Subject {
  const stamp = now();
  return {
    ...source,
    id: uid(),
    name: `${source.name.slice(0, LIMITS.subjectName - 4)} 사본`,
    items: source.items.map((i) => ({ ...i, id: uid() })),
    cuts: source.cuts.map((c) => ({ ...c, id: uid() })),
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/* ------------------------------------------------------------------ 검증 */

export type FieldErrors = Partial<Record<'name' | 'weight' | 'max' | 'step' | 'score', string>>;

/** 0 이상, 소수 둘째 자리까지. 범위를 벗어나면 사람이 읽을 메시지를 돌려준다. */
export function decimalError(
  value: string,
  { min = 0, max = 100, positive = false }: { min?: number; max?: number; positive?: boolean } = {},
): string | undefined {
  if (value.trim() === '') return '값을 입력해 주세요.';
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return '0 이상, 소수 둘째 자리까지 입력할 수 있어요.';
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return `${min} 이상 ${max} 이하로 입력해 주세요.`;
  if (positive && n === 0) return '0 보다 커야 해요.';
  return undefined;
}

/** 점수가 [0, 만점] 안에 있고 입력 간격의 배수인가. 만점 자체는 간격과 무관하게 항상 유효. */
export function isValidScore(score: Q, item: Evaluation): boolean {
  const max = Q.parse(item.max);
  const step = Q.parse(item.step);
  if (!max || !step) return false;
  if (score.lt(ZERO) || score.gt(max)) return false;
  return score.eq(max) || score.isMultipleOf(step);
}

export function evaluationErrors(item: Evaluation): FieldErrors {
  const errors: FieldErrors = {};
  const name = item.name.trim();
  if (!name || item.name.length > LIMITS.itemName) {
    errors.name = `평가 이름은 1~${LIMITS.itemName}자로 입력해 주세요.`;
  }
  errors.weight = decimalError(item.weight, { max: 100 });
  errors.max = decimalError(item.max, { max: LIMITS.maxValue, positive: true });
  errors.step = decimalError(item.step, { max: LIMITS.maxValue, positive: true });

  if (item.status !== 'missing' || item.score.trim() !== '') {
    const maxNum = Number(item.max);
    errors.score = decimalError(item.score, {
      max: Number.isFinite(maxNum) ? maxNum : LIMITS.maxValue,
    });
    if (!errors.score && !errors.max && !errors.step) {
      const score = Q.parse(item.score);
      if (score && !isValidScore(score, item)) {
        errors.score = `${item.step}점 단위로, 또는 만점 ${item.max}점을 입력해 주세요.`;
      }
    }
  }
  for (const key of Object.keys(errors) as (keyof FieldErrors)[]) {
    if (!errors[key]) delete errors[key];
  }
  return errors;
}

export const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;

export function cutErrors(cuts: GradeCut[]): string[] {
  const out: string[] = [];
  const names = new Set<string>();
  cuts.forEach((cut, index) => {
    const name = cut.name.trim();
    if (!name || name.length > LIMITS.cutName)
      out.push(`성취도 이름은 1~${LIMITS.cutName}자여야 해요.`);
    else if (names.has(name)) out.push('성취도 이름이 중복됐어요.');
    names.add(name);

    const err = decimalError(cut.lower);
    if (err) out.push(`성취도 하한: ${err}`);
    else if (index > 0) {
      const prev = Q.parse(cuts[index - 1]!.lower);
      const here = Q.parse(cut.lower);
      if (prev && here && here.gte(prev))
        out.push('성취도는 하한이 높은 것부터 낮은 순서로 입력해 주세요.');
    }
  });
  const last = cuts.at(-1);
  if (last) {
    const lower = Q.parse(last.lower);
    if (!lower || !lower.isZero()) out.push('가장 낮은 성취도의 하한은 0이어야 해요.');
  }
  return [...new Set(out)];
}

export interface SubjectIssue {
  level: 'error' | 'warn';
  message: string;
}

/** 과목 전체를 훑어 사용자에게 보여줄 문제 목록을 만든다. */
export function subjectIssues(subject: Subject): SubjectIssue[] {
  const issues: SubjectIssue[] = [];
  if (!subject.name.trim()) issues.push({ level: 'error', message: '과목 이름을 입력해 주세요.' });
  if (subject.items.length === 0) {
    issues.push({
      level: 'warn',
      message: '평가가 아직 없어요. 평가를 추가하면 계산이 시작됩니다.',
    });
  }
  const broken = subject.items.filter((i) => hasErrors(evaluationErrors(i)));
  if (broken.length) {
    issues.push({
      level: 'error',
      message: `입력값에 오류가 있는 평가가 ${broken.length}개 있어요.`,
    });
  }
  if (subject.items.length && !broken.length) {
    const total = weightTotal(subject.items);
    if (!total.eq(HUNDRED)) {
      issues.push({
        level: 'warn',
        message: `반영 비율 합계가 ${total.toDecimal(2)}% 예요. 100% 로 맞춰야 정확한 결과가 나옵니다.`,
      });
    }
  }
  if (decimalError(subject.target))
    issues.push({ level: 'error', message: '목표 점수를 0~100 으로 입력해 주세요.' });
  issues.push(...cutErrors(subject.cuts).map((message) => ({ level: 'error' as const, message })));
  return issues;
}

/* ------------------------------------------------------------------ 계산 */

export const weightTotal = (items: Evaluation[]): Q =>
  items.reduce((sum, i) => sum.add(Q.parse(i.weight) ?? ZERO), ZERO);

/** 이 평가가 최종 점수에 실제로 기여하는 점수. (원점수 / 만점) × 반영비율 */
export function contribution(item: Evaluation, rawScore: string = item.score): Q {
  const score = Q.parse(rawScore);
  const max = Q.parse(item.max);
  const weight = Q.parse(item.weight);
  if (!score || !max || !weight || max.isZero()) return ZERO;
  return score.div(max).mul(weight);
}

/** 이 평가에서 만점을 받았을 때의 기여 점수. = 반영 비율 */
export const maxContribution = (item: Evaluation): Q => Q.parse(item.weight) ?? ZERO;

export interface Summary {
  /** 확정된 평가만 더한 점수 */
  secured: Q;
  /** 확정 + 예상 */
  projected: Q;
  /** 아직 확정되지 않은 평가들 */
  pending: Evaluation[];
  /** 아직 아무 값도 없는 평가들 */
  missing: Evaluation[];
  /** 확정되지 않은 평가들의 반영 비율 합 */
  pendingWeight: Q;
  /** 남은 평가를 모두 0점 받았을 때 */
  floor: Q;
  /** 남은 평가를 모두 만점 받았을 때 */
  ceiling: Q;
  /** 예상 점수를 유지한 채 미입력만 0점 / 만점일 때 */
  projectedFloor: Q;
  projectedCeiling: Q;
  weightTotal: Q;
  complete: boolean;
  allConfirmed: boolean;
}

export function summarize(items: Evaluation[]): Summary {
  const sum = (list: Evaluation[]) => list.reduce((acc, i) => acc.add(contribution(i)), ZERO);
  const confirmed = items.filter((i) => i.status === 'confirmed');
  const entered = items.filter((i) => i.status !== 'missing');
  const pending = items.filter((i) => i.status !== 'confirmed');
  const missing = items.filter((i) => i.status === 'missing');

  const secured = sum(confirmed);
  const projected = sum(entered);
  const pendingWeight = weightTotal(pending);
  const missingWeight = weightTotal(missing);

  return {
    secured,
    projected,
    pending,
    missing,
    pendingWeight,
    floor: secured,
    ceiling: secured.add(pendingWeight),
    projectedFloor: projected,
    projectedCeiling: projected.add(missingWeight),
    weightTotal: weightTotal(items),
    complete: items.length > 0 && missing.length === 0,
    allConfirmed: items.length > 0 && pending.length === 0,
  };
}

/** 필요한 기여 점수를 원점수로 되돌리고, 입력 간격에 맞춰 올린 "실제로 받아야 하는 점수". */
export function minimumScoreFor(requiredContribution: Q, item: Evaluation): Q | null {
  const max = Q.parse(item.max);
  const step = Q.parse(item.step);
  const weight = Q.parse(item.weight);
  if (!max || !step || !weight || weight.isZero()) return null;
  const rawScore = requiredContribution.mul(max).div(weight);
  if (rawScore.gt(max)) return null;
  if (rawScore.lte(ZERO)) return ZERO;
  const rounded = rawScore.ceilToStep(step);
  return rounded.gt(max) ? max : rounded;
}

export type SolveResult =
  | { kind: 'invalid' }
  | { kind: 'zero-weight' }
  /** 다른 평가 중 값이 없는 게 있어 확정 계산이 안 되는 경우 */
  | { kind: 'other-missing'; names: string[] }
  | { kind: 'impossible'; theory: Q; best: Q; shortfall: Q }
  | { kind: 'already'; theory: Q; other: Q }
  | { kind: 'possible'; theory: Q; minimum: Q; final: Q; other: Q; rate: Q };

/**
 * "이 평가에서 몇 점 받아야 목표에 닿는가."
 * theory 는 이론적인 실수 값, minimum 은 입력 간격을 반영한 실제 받아야 하는 점수다.
 */
export function solveFor(items: Evaluation[], target: string, targetId: string): SolveResult {
  const targetQ = Q.parse(target);
  if (!targetQ || items.some((i) => hasErrors(evaluationErrors(i)))) return { kind: 'invalid' };

  const item = items.find((i) => i.id === targetId);
  if (!item) return { kind: 'invalid' };

  const weight = Q.parse(item.weight)!;
  if (weight.isZero()) return { kind: 'zero-weight' };

  const others = items.filter((i) => i.id !== targetId);
  const blocking = others.filter(
    (i) => i.status === 'missing' && (Q.parse(i.weight) ?? ZERO).gt(ZERO),
  );
  if (blocking.length) return { kind: 'other-missing', names: blocking.map((i) => i.name) };

  const other = others.reduce(
    (acc, i) => (i.status === 'missing' ? acc : acc.add(contribution(i))),
    ZERO,
  );
  const need = targetQ.sub(other);
  const max = Q.parse(item.max)!;
  const theory = need.mul(max).div(weight);

  if (need.lte(ZERO)) return { kind: 'already', theory, other };

  const minimum = minimumScoreFor(need, item);
  if (!minimum) {
    const best = other.add(weight);
    return { kind: 'impossible', theory, best, shortfall: targetQ.sub(best) };
  }
  const final = other.add(contribution(item, minimum.toDecimal(10)));
  return { kind: 'possible', theory, minimum, final, other, rate: minimum.div(max) };
}

export type EvenResult =
  | { kind: 'already' }
  | { kind: 'impossible'; best: Q; shortfall: Q }
  | {
      kind: 'possible';
      rate: Q;
      scores: { id: string; name: string; score: Q; max: Q }[];
      final: Q;
    };

/** 남은 평가를 전부 "같은 득점률"로 받는다고 볼 때 필요한 비율. */
export function evenScenario(items: Evaluation[], target: string): EvenResult {
  const targetQ = Q.parse(target);
  if (!targetQ) return { kind: 'already' };
  const s = summarize(items);
  const need = targetQ.sub(s.secured);
  if (need.lte(ZERO)) return { kind: 'already' };
  if (s.pendingWeight.isZero() || need.gt(s.pendingWeight)) {
    const best = s.ceiling;
    return { kind: 'impossible', best, shortfall: targetQ.sub(best) };
  }
  const rate = need.div(s.pendingWeight);
  const scores = s.pending.flatMap((item) => {
    const max = Q.parse(item.max);
    const step = Q.parse(item.step);
    if (!max || !step) return [];
    const raw = rate.mul(max).ceilToStep(step);
    return [{ id: item.id, name: item.name, score: Q.min(raw, max), max }];
  });
  const final = scores.reduce((acc, x) => {
    const item = items.find((i) => i.id === x.id)!;
    return acc.add(contribution(item, x.score.toDecimal(10)));
  }, s.secured);
  return { kind: 'possible', rate, scores, final };
}

/** 가정한 점수(id → 원점수 문자열)를 반영한 총점. 시뮬레이터용. */
export function simulate(items: Evaluation[], overrides: Record<string, string>): Q {
  return items.reduce((acc, item) => {
    const override = overrides[item.id];
    if (override !== undefined) return acc.add(contribution(item, override));
    return item.status === 'missing' ? acc : acc.add(contribution(item));
  }, ZERO);
}

export const gradeFor = (score: Q, cuts: GradeCut[]): GradeCut | undefined =>
  cuts.find((c) => {
    const lower = Q.parse(c.lower);
    return lower ? score.gte(lower) : false;
  });

/** 지금 점수에서 한 단계 위 성취도까지 남은 점수. 이미 최상위면 null. */
export function nextGradeGap(score: Q, cuts: GradeCut[]): { cut: GradeCut; gap: Q } | null {
  const sorted = [...cuts].filter((c) => Q.parse(c.lower));
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const cut = sorted[i]!;
    const lower = Q.parse(cut.lower)!;
    if (score.lt(lower)) return { cut, gap: lower.sub(score) };
  }
  return null;
}

export interface SubjectStat {
  subject: Subject;
  summary: Summary;
  grade?: GradeCut;
  target: Q | null;
  /** 목표까지 남은 점수 (이미 넘었으면 0) */
  gap: Q;
  reachable: boolean;
}

export function subjectStat(subject: Subject): SubjectStat {
  const summary = summarize(subject.items);
  const target = Q.parse(subject.target);
  const gap = target ? Q.max(target.sub(summary.projected), ZERO) : ZERO;
  const reachable = target ? summary.ceiling.gte(target) : true;
  return {
    subject,
    summary,
    grade: gradeFor(summary.projected, subject.cuts),
    target,
    gap,
    reachable,
  };
}

/** 모든 과목을 가로질러 보는 요약. */
export function overallStats(subjects: Subject[]) {
  const stats = subjects.map(subjectStat);
  const usable = stats.filter((s) => s.subject.items.length > 0);
  const average = usable.length
    ? usable.reduce((acc, s) => acc.add(s.summary.projected), ZERO).div(Q.of(usable.length))
    : ZERO;
  return {
    stats,
    average,
    count: subjects.length,
    onTrack: usable.filter((s) => s.target && s.summary.projected.gte(s.target)).length,
    atRisk: usable.filter((s) => !s.reachable).length,
  };
}
