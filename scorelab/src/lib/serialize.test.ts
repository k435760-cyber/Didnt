import { describe, expect, it } from 'vitest';
import {
  emptyWorkspace,
  makeEvaluation,
  makeSubject,
  sampleSubject,
  type Workspace,
} from './engine';
import { ImportError, mergeWorkspace, parseWorkspace, serialize } from './serialize';

const workspaceOf = (...subjects: ReturnType<typeof makeSubject>[]): Workspace => ({
  version: 2,
  subjects,
  activeId: subjects[0]?.id ?? '',
  updatedAt: new Date().toISOString(),
});

describe('직렬화 왕복', () => {
  it('내보낸 걸 그대로 다시 읽으면 같은 값이 나온다', () => {
    const before = workspaceOf(sampleSubject());
    const after = parseWorkspace(serialize(before));
    expect(after.subjects).toHaveLength(1);
    expect(after.subjects[0]!.name).toBe('수학');
    expect(after.subjects[0]!.items.map((i) => i.score)).toEqual(
      before.subjects[0]!.items.map((i) => i.score),
    );
    expect(after.activeId).toBe(before.activeId);
  });

  it('미입력 점수는 null 로 나가고, 적어 둔 값은 되살아난다', () => {
    const subject = makeSubject({
      items: [makeEvaluation({ weight: '100', max: '100', status: 'missing', score: '77' })],
    });
    const json = JSON.parse(serialize(workspaceOf(subject)));
    expect(json.subjects[0].items[0].score).toBeNull();
    expect(json.subjects[0].items[0].rememberedScore).toBe(77);

    const back = parseWorkspace(serialize(workspaceOf(subject)));
    expect(back.subjects[0]!.items[0]!.status).toBe('missing');
    expect(back.subjects[0]!.items[0]!.score).toBe('77');
  });

  it('빈 워크스페이스도 왕복한다', () => {
    const empty = { ...emptyWorkspace(), subjects: [], activeId: '' };
    expect(parseWorkspace(serialize(empty)).subjects).toEqual([]);
  });
});

describe('가져오기 검증', () => {
  const bad = (raw: string) => expect(() => parseWorkspace(raw)).toThrow(ImportError);

  it('JSON 이 아니면 거절한다', () => bad('이건 그냥 글'));
  it('버전이 다르면 거절한다', () =>
    bad(JSON.stringify({ version: 99, subjects: [], activeId: '' })));
  it('과목 목록이 없으면 거절한다', () => bad(JSON.stringify({ version: 2, activeId: '' })));

  it('범위를 벗어난 값은 통째로 거절한다', () => {
    const raw = serialize(
      workspaceOf(
        makeSubject({
          items: [makeEvaluation({ weight: '30', max: '100', score: '50', status: 'confirmed' })],
        }),
      ),
    );
    const broken = JSON.parse(raw);
    broken.subjects[0].items[0].score = 5000; // 만점보다 큰 점수
    bad(JSON.stringify(broken));
  });

  it('성취도 순서가 뒤집혀 있으면 거절한다', () => {
    const raw = JSON.parse(serialize(workspaceOf(makeSubject({ items: [] }))));
    raw.subjects[0].cuts = [
      { id: 'a', name: 'A', lower: 10 },
      { id: 'b', name: 'B', lower: 90 },
    ];
    bad(JSON.stringify(raw));
  });

  it('지나치게 긴 이름은 거절한다', () => {
    const raw = JSON.parse(serialize(workspaceOf(makeSubject())));
    raw.subjects[0].name = 'ㄱ'.repeat(200);
    bad(JSON.stringify(raw));
  });

  it('activeId 가 없는 과목을 가리키면 첫 과목으로 고친다', () => {
    const raw = JSON.parse(serialize(workspaceOf(makeSubject({ name: '국어' }))));
    raw.activeId = '존재하지-않는-id';
    expect(parseWorkspace(JSON.stringify(raw)).subjects[0]!.name).toBe('국어');
    expect(parseWorkspace(JSON.stringify(raw)).activeId).toBe(raw.subjects[0].id);
  });

  it('중복된 id 는 새로 발급한다', () => {
    const one = makeSubject({ name: '과학' });
    const raw = JSON.parse(serialize(workspaceOf(one)));
    raw.subjects.push(JSON.parse(JSON.stringify(raw.subjects[0])));
    const parsed = parseWorkspace(JSON.stringify(raw));
    expect(parsed.subjects[0]!.id).not.toBe(parsed.subjects[1]!.id);
  });
});

describe('합치기', () => {
  it('append 는 기존 과목을 남긴 채 덧붙인다', () => {
    const current = workspaceOf(makeSubject({ name: '기존' }));
    const incoming = workspaceOf(makeSubject({ name: '새것' }));
    const merged = mergeWorkspace(current, incoming, 'append');
    expect(merged.subjects.map((s) => s.name)).toEqual(['기존', '새것']);
  });

  it('replace 는 통째로 갈아끼운다', () => {
    const current = workspaceOf(makeSubject({ name: '기존' }));
    const incoming = workspaceOf(makeSubject({ name: '새것' }));
    expect(mergeWorkspace(current, incoming, 'replace').subjects.map((s) => s.name)).toEqual([
      '새것',
    ]);
  });

  it('한도를 넘기면 거절한다', () => {
    const many = (n: number, prefix: string) =>
      workspaceOf(...Array.from({ length: n }, (_, i) => makeSubject({ name: `${prefix}${i}` })));
    expect(() => mergeWorkspace(many(30, 'a'), many(30, 'b'), 'append')).toThrow(ImportError);
  });
});
