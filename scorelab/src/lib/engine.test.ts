import { describe, expect, it } from 'vitest';
import { Q } from './rational';
import {
  contribution,
  cutErrors,
  evaluationErrors,
  evenScenario,
  gradeFor,
  isValidScore,
  makeCuts,
  makeEvaluation,
  makeSubject,
  minimumScoreFor,
  nextGradeGap,
  emptyWorkspace,
  overallStats,
  simulate,
  solveFor,
  subjectIssues,
  summarize,
  uid,
  weightTotal,
} from './engine';

const item = (patch: Parameters<typeof makeEvaluation>[0]) => makeEvaluation(patch);

/** 실제로 다 채워 넣은 과목. 앱은 예시 데이터를 만들지 않으므로 테스트에서 직접 만든다. */
const filledSubject = () =>
  makeSubject({
    name: '수학',
    hue: 4,
    target: '90',
    cuts: makeCuts(),
    items: [
      item({
        name: '1학기 중간고사',
        category: 'written',
        weight: '30',
        max: '100',
        status: 'confirmed',
        score: '84',
      }),
      item({ name: '1학기 기말고사', category: 'written', weight: '30', max: '100' }),
      item({
        name: '서술형 수행',
        category: 'performance',
        weight: '20',
        max: '20',
        step: '0.5',
        status: 'confirmed',
        score: '18.5',
      }),
      item({
        name: '탐구 보고서',
        category: 'performance',
        weight: '20',
        max: '10',
        step: '0.5',
        status: 'expected',
        score: '9',
      }),
    ],
  });

describe('기여도와 합계', () => {
  it('원점수를 반영 비율로 환산한다', () => {
    const midterm = item({ weight: '30', max: '100', score: '80', status: 'confirmed' });
    expect(contribution(midterm).toDecimal()).toBe('24');
  });

  it('만점이 반영 비율과 달라도 환산한다', () => {
    const performance = item({ weight: '20', max: '20', score: '18.5', status: 'confirmed' });
    expect(contribution(performance).toDecimal()).toBe('18.5');
  });

  it('만점이 0 이면 기여도는 0 이다', () => {
    expect(contribution(item({ weight: '30', max: '0', score: '0' })).isZero()).toBe(true);
  });

  it('반영 비율 합계를 정확히 더한다', () => {
    const items = [item({ weight: '33.33' }), item({ weight: '33.33' }), item({ weight: '33.34' })];
    expect(weightTotal(items).toDecimal()).toBe('100');
  });
});

describe('summarize', () => {
  const items = [
    item({ name: '중간', weight: '30', max: '100', score: '84', status: 'confirmed' }),
    item({ name: '기말', weight: '30', max: '100', status: 'missing' }),
    item({ name: '수행A', weight: '20', max: '20', score: '18.5', status: 'confirmed' }),
    item({ name: '수행B', weight: '20', max: '10', score: '9', status: 'expected' }),
  ];

  it('확정만 더한 값과 예상 포함 값을 나눈다', () => {
    const s = summarize(items);
    expect(s.secured.toDecimal()).toBe('43.7'); // 25.2 + 18.5
    expect(s.projected.toDecimal()).toBe('61.7'); // + 18
  });

  it('남은 평가를 0점/만점으로 본 하한과 상한을 준다', () => {
    const s = summarize(items);
    expect(s.floor.toDecimal()).toBe('43.7');
    expect(s.ceiling.toDecimal()).toBe('93.7'); // + 기말30 + 수행B20
    expect(s.projectedCeiling.toDecimal()).toBe('91.7'); // 예상 유지 + 기말 30
  });

  it('미입력이 없으면 complete 이다', () => {
    expect(summarize(items).complete).toBe(false);
    const filled = items.map((i) => ({
      ...i,
      status: 'confirmed' as const,
      score: i.score || '50',
    }));
    expect(summarize(filled).allConfirmed).toBe(true);
  });

  it('평가가 없으면 complete 이 아니다', () => {
    expect(summarize([]).complete).toBe(false);
  });
});

describe('minimumScoreFor', () => {
  it('입력 간격에 맞춰 올린다', () => {
    const target = item({ weight: '20', max: '20', step: '0.5' });
    // 16.3점 기여가 필요 → 원점수 16.3 → 0.5 단위 올림 → 16.5
    expect(minimumScoreFor(Q.of('16.3'), target)!.toDecimal()).toBe('16.5');
  });

  it('만점을 넘으면 불가능이다', () => {
    const target = item({ weight: '20', max: '20', step: '0.5' });
    expect(minimumScoreFor(Q.of('21'), target)).toBeNull();
  });

  it('간격 배수가 아니어도 만점은 유효한 끝점이다', () => {
    const target = item({ weight: '10', max: '7', step: '2' });
    expect(minimumScoreFor(Q.of('9.9'), target)!.toDecimal()).toBe('7');
  });

  it('이미 충족했으면 0 이다', () => {
    expect(minimumScoreFor(Q.of('-5'), item({ weight: '10', max: '10' }))!.isZero()).toBe(true);
  });

  it('반영 비율이 0 이면 계산할 수 없다', () => {
    expect(minimumScoreFor(Q.of('1'), item({ weight: '0', max: '10' }))).toBeNull();
  });
});

describe('solveFor', () => {
  const base = () => [
    item({
      id: 'a',
      name: '중간',
      weight: '30',
      max: '100',
      step: '1',
      score: '84',
      status: 'confirmed',
    }),
    item({ id: 'b', name: '기말', weight: '30', max: '100', step: '1', status: 'missing' }),
    item({
      id: 'c',
      name: '수행A',
      weight: '20',
      max: '20',
      step: '0.5',
      score: '18.5',
      status: 'confirmed',
    }),
    item({
      id: 'd',
      name: '수행B',
      weight: '20',
      max: '10',
      step: '0.5',
      score: '9',
      status: 'expected',
    }),
  ];

  it('목표까지 필요한 점수를 역산한다', () => {
    const items = base();
    const r = solveFor(items, '90', 'b');
    expect(r.kind).toBe('possible');
    if (r.kind !== 'possible') return;
    // 확정+예상 61.7, 목표 90 → 28.3 기여 필요 → 100점 만점 30% 환산 → 94.333...
    expect(r.theory.toFixed(4)).toBe('94.3333');
    expect(r.minimum.toDecimal()).toBe('95'); // 1점 단위 올림
    expect(r.final.gte(Q.of('90'))).toBe(true);
  });

  it('돌려준 최소 점수는 항상 목표를 만족한다', () => {
    for (const target of ['70', '85', '88.5', '90', '93.7']) {
      const r = solveFor(base(), target, 'b');
      if (r.kind === 'possible') expect(r.final.gte(Q.of(target))).toBe(true);
    }
  });

  it('만점을 받아도 못 닿으면 부족분을 알려준다', () => {
    const r = solveFor(base(), '99', 'b');
    expect(r.kind).toBe('impossible');
    if (r.kind !== 'impossible') return;
    expect(r.best.toDecimal()).toBe('91.7');
    expect(r.shortfall.toDecimal()).toBe('7.3');
  });

  it('이미 목표를 넘었으면 already 다', () => {
    const r = solveFor(base(), '50', 'b');
    expect(r.kind).toBe('already');
  });

  it('다른 평가가 비어 있으면 계산을 막고 이름을 알려준다', () => {
    const items = base().map((i) => (i.id === 'c' ? { ...i, status: 'missing' as const } : i));
    const r = solveFor(items, '90', 'b');
    expect(r.kind).toBe('other-missing');
    if (r.kind === 'other-missing') expect(r.names).toContain('수행A');
  });

  it('반영 비율 0 인 평가로는 목표를 맞출 수 없다', () => {
    const items = base().map((i) => (i.id === 'b' ? { ...i, weight: '0' } : i));
    expect(solveFor(items, '90', 'b').kind).toBe('zero-weight');
  });

  it('입력 오류가 있으면 invalid 다', () => {
    const items = base().map((i) => (i.id === 'a' ? { ...i, max: '-1' } : i));
    expect(solveFor(items, '90', 'b').kind).toBe('invalid');
    expect(solveFor(base(), 'abc', 'b').kind).toBe('invalid');
    expect(solveFor(base(), '90', 'nope').kind).toBe('invalid');
  });
});

describe('evenScenario', () => {
  const items = [
    item({ id: 'a', weight: '40', max: '100', step: '1', score: '80', status: 'confirmed' }),
    item({ id: 'b', weight: '30', max: '100', step: '1', status: 'missing' }),
    item({ id: 'c', weight: '30', max: '50', step: '0.5', status: 'missing' }),
  ];

  it('남은 평가를 같은 득점률로 채운다', () => {
    const r = evenScenario(items, '90');
    expect(r.kind).toBe('possible');
    if (r.kind !== 'possible') return;
    // 확보 32, 목표 90 → 58 필요 / 남은 비율 60 → 96.67%
    expect(r.rate.toFixed(4)).toBe('0.9667');
    expect(r.final.gte(Q.of('90'))).toBe(true);
    expect(r.scores.map((s) => s.score.toDecimal())).toEqual(['97', '48.5']);
  });

  it('닿을 수 없으면 최선값과 부족분을 준다', () => {
    const r = evenScenario(items, '95');
    expect(r.kind).toBe('impossible');
    if (r.kind === 'impossible') expect(r.best.toDecimal()).toBe('92');
  });

  it('이미 달성했으면 already 다', () => {
    expect(evenScenario(items, '20').kind).toBe('already');
  });
});

describe('simulate', () => {
  it('가정한 점수를 반영한 총점을 낸다', () => {
    const items = [
      item({ id: 'a', weight: '50', max: '100', score: '90', status: 'confirmed' }),
      item({ id: 'b', weight: '50', max: '100', status: 'missing' }),
    ];
    expect(simulate(items, {}).toDecimal()).toBe('45');
    expect(simulate(items, { b: '100' }).toDecimal()).toBe('95');
    expect(simulate(items, { a: '60', b: '80' }).toDecimal()).toBe('70');
  });
});

describe('성취도', () => {
  const cuts = makeCuts();

  it('구간에 맞는 성취도를 찾는다', () => {
    expect(gradeFor(Q.of('90'), cuts)?.name).toBe('A');
    expect(gradeFor(Q.of('89.99'), cuts)?.name).toBe('B');
    expect(gradeFor(Q.of('0'), cuts)?.name).toBe('E');
  });

  it('다음 등급까지 남은 점수를 센다', () => {
    const gap = nextGradeGap(Q.of('87.5'), cuts);
    expect(gap?.cut.name).toBe('A');
    expect(gap?.gap.toDecimal()).toBe('2.5');
    expect(nextGradeGap(Q.of('95'), cuts)).toBeNull();
  });

  it('순서와 하한 규칙을 검증한다', () => {
    expect(cutErrors(cuts)).toEqual([]);
    expect(
      cutErrors([
        { id: '1', name: 'A', lower: '50' },
        { id: '2', name: 'B', lower: '70' },
      ]).length,
    ).toBeGreaterThan(0);
    expect(
      cutErrors([{ id: '1', name: 'A', lower: '50' }]).some((e) => e.includes('0이어야')),
    ).toBe(true);
  });
});

describe('검증', () => {
  it('간격의 배수가 아닌 점수를 잡아낸다', () => {
    const e = evaluationErrors(
      item({ max: '20', step: '0.5', score: '18.3', status: 'confirmed' }),
    );
    expect(e.score).toBeDefined();
    expect(
      evaluationErrors(item({ max: '20', step: '0.5', score: '18.5', status: 'confirmed' })).score,
    ).toBeUndefined();
  });

  it('만점은 간격과 무관하게 유효하다', () => {
    expect(isValidScore(Q.of('7'), item({ max: '7', step: '2' }))).toBe(true);
    expect(isValidScore(Q.of('5'), item({ max: '7', step: '2' }))).toBe(false);
  });

  it('미입력이면서 점수 칸이 비면 점수 오류가 없다', () => {
    expect(evaluationErrors(item({ status: 'missing', score: '' })).score).toBeUndefined();
  });

  it('반영 비율 합이 100 이 아니면 경고한다', () => {
    const subject = makeSubject({ items: [item({ weight: '50' })], cuts: [] });
    expect(
      subjectIssues(subject).some((i) => i.level === 'warn' && i.message.includes('100%')),
    ).toBe(true);
  });

  it('제대로 채운 과목에는 오류가 없다', () => {
    expect(subjectIssues(filledSubject()).filter((i) => i.level === 'error')).toEqual([]);
  });
});

describe('처음 상태', () => {
  it('예시 데이터 없이 빈 워크스페이스로 시작한다', () => {
    const workspace = emptyWorkspace();
    expect(workspace.subjects).toEqual([]);
    expect(workspace.activeId).toBe('');
  });

  it('id 는 서버의 uuid 컬럼에 들어갈 수 있는 형식이다', () => {
    expect(uid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('overallStats', () => {
  it('과목들을 가로질러 평균과 위험 과목을 센다', () => {
    const ok = makeSubject({
      target: '50',
      items: [item({ weight: '100', max: '100', score: '90', status: 'confirmed' })],
    });
    const risky = makeSubject({
      target: '95',
      items: [item({ weight: '100', max: '100', score: '10', status: 'confirmed' })],
    });
    const stats = overallStats([ok, risky]);
    expect(stats.average.toDecimal()).toBe('50');
    expect(stats.onTrack).toBe(1);
    expect(stats.atRisk).toBe(1);
  });
});
