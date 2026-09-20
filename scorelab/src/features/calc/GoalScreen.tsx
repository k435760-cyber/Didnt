/** 목표 화면: 역산, 동일 득점률 시나리오, 시뮬레이터. */
import { useEffect, useMemo, useState } from 'react';
import {
  contribution,
  evenScenario,
  gradeFor,
  simulate,
  solveFor,
  subjectIssues,
  summarize,
  type Evaluation,
  type Subject,
} from '../../lib/engine';
import { Q, ZERO } from '../../lib/rational';
import { percent, score as fmtScore, subjectColor } from '../../lib/format';
import { Icon } from '../../ui/Icon';
import { Banner, Empty, Field, Meter, Segmented } from '../../ui/primitives';
import { useWorkspace } from '../../state/workspace';
import { useSettings } from '../../state/settings';
import { useSubjectActions } from '../subjects/actions';

type Mode = 'solve' | 'even' | 'simulate';

const TARGET_PRESETS = ['100', '95', '90', '85', '80'];

export function GoalScreen({ subject }: { subject: Subject }) {
  const { patchSubject } = useWorkspace();
  const actions = useSubjectActions();
  const [mode, setMode] = useState<Mode>('solve');

  const summary = useMemo(() => summarize(subject.items), [subject.items]);
  const problems = useMemo(
    () => subjectIssues(subject).filter((issue) => issue.level === 'error'),
    [subject],
  );
  const ready = problems.length === 0;
  const color = subjectColor(subject);

  if (subject.items.length === 0) {
    return (
      <div className="page">
        <header className="page__head">
          <div>
            <h1 className="page__title">목표</h1>
            <p className="page__sub">{subject.name}</p>
          </div>
        </header>
        <div className="card">
          <Empty
            icon="target"
            title="계산할 평가가 없어요"
            description="평가를 추가하면 목표까지 몇 점이 필요한지 계산해 드릴게요."
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void actions.createEvaluation(subject)}
              >
                <Icon name="plus" size={17} />
                평가 추가
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page page--narrow" style={{ ['--subject-color' as string]: color }}>
      <header className="page__head">
        <div style={{ minWidth: 0 }}>
          <h1 className="page__title">목표</h1>
          <p className="page__sub">{subject.name}</p>
        </div>
      </header>

      <section className="card">
        <div className="card__body stack">
          <Field label="목표 점수" unit="점" compact>
            <input
              className="input input--num"
              inputMode="decimal"
              value={subject.target}
              onChange={(event) => patchSubject(subject.id, { target: event.target.value })}
            />
          </Field>
          <div className="chip-row" role="group" aria-label="자주 쓰는 목표">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="chip"
                aria-pressed={subject.target === preset}
                onClick={() => patchSubject(subject.id, { target: preset })}
              >
                {preset}점
              </button>
            ))}
          </div>
          <div className="hero__range">
            <span>
              지금: <b>{fmtScore(summary.projected)}점</b>
            </span>
            <span>
              최대: <b>{fmtScore(summary.ceiling)}점</b>
            </span>
          </div>
        </div>
      </section>

      {problems.map((problem) => (
        <Banner key={problem.message} tone="bad">
          {problem.message}
        </Banner>
      ))}

      <Segmented
        block
        label="계산 방식"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'solve', label: '한 평가 역산' },
          { value: 'even', label: '같은 비율' },
          { value: 'simulate', label: '시뮬레이터' },
        ]}
      />

      {ready && mode === 'solve' && <SolvePanel subject={subject} />}
      {ready && mode === 'even' && <EvenPanel subject={subject} />}
      {ready && mode === 'simulate' && <SimulatePanel subject={subject} />}
    </div>
  );
}

/* ------------------------------------------------------------------ 역산 */

function SolvePanel({ subject }: { subject: Subject }) {
  const { settings } = useSettings();
  const candidates = subject.items.filter((i) => i.status !== 'confirmed');
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? '');

  useEffect(() => {
    if (!candidates.some((i) => i.id === targetId)) setTargetId(candidates[0]?.id ?? '');
  }, [candidates, targetId]);

  const selected = subject.items.find((i) => i.id === targetId);
  const result = useMemo(
    () => (selected ? solveFor(subject.items, subject.target, selected.id) : null),
    [subject.items, subject.target, selected],
  );

  if (candidates.length === 0) {
    return (
      <div className="card">
        <Empty
          icon="check-circle"
          title="모든 평가가 확정됐어요"
          description="역산할 남은 평가가 없습니다."
        />
      </div>
    );
  }

  return (
    <section className="stack">
      <div className="chip-row" role="group" aria-label="역산할 평가">
        {candidates.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            aria-pressed={item.id === targetId}
            onClick={() => setTargetId(item.id)}
          >
            {item.name || '이름 없음'}
          </button>
        ))}
      </div>

      {selected && result && (
        <SolveResultCard
          item={selected}
          result={result}
          showSteps={settings.showSteps}
          target={subject.target}
        />
      )}
    </section>
  );
}

function SolveResultCard({
  item,
  result,
  showSteps,
  target,
}: {
  item: Evaluation;
  result: ReturnType<typeof solveFor>;
  showSteps: boolean;
  target: string;
}) {
  if (result.kind === 'invalid') {
    return <Banner tone="bad">입력값을 확인해 주세요.</Banner>;
  }
  if (result.kind === 'zero-weight') {
    return (
      <Banner tone="warn">
        "{item.name}" 의 반영 비율이 0% 라서 이 평가로는 점수를 움직일 수 없어요.
      </Banner>
    );
  }
  if (result.kind === 'other-missing') {
    return (
      <Banner tone="warn">
        먼저 {result.names.slice(0, 3).join(', ')}
        {result.names.length > 3 ? ` 외 ${result.names.length - 3}개` : ''} 의 점수를 예상이나
        확정으로 채워 주세요.
      </Banner>
    );
  }
  if (result.kind === 'already') {
    return (
      <div className="result result--ok">
        <p className="result__headline">이미 목표를 넘었어요.</p>
        <p className="result__note">
          "{item.name}" 에서 0점을 받아도 {target}점을 유지합니다. 지금까지 쌓인 점수만{' '}
          {fmtScore(result.other)}점이에요.
        </p>
      </div>
    );
  }
  if (result.kind === 'impossible') {
    return (
      <div className="result result--bad">
        <p className="result__headline">이 평가만으로는 목표에 닿지 않아요.</p>
        <div className="result__big">
          <span className="result__big-value">{fmtScore(result.best)}</span>
          <span className="result__big-unit">점이 최대</span>
        </div>
        <p className="result__note">
          "{item.name}" 에서 만점을 받아도 {fmtScore(result.shortfall)}점이 모자랍니다. 목표를
          낮추거나 다른 평가의 예상 점수를 올려 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="result result--ok">
      <p className="result__headline">"{item.name}" 에서</p>
      <div className="result__big">
        <span className="result__big-value">{fmtScore(result.minimum)}</span>
        <span className="result__big-unit">점 이상 (만점 {item.max})</span>
      </div>
      <p className="result__note">
        이론값은 {result.theory.toDecimal(4)}점이지만, 이 평가는 {item.step}점 단위로만 받을 수
        있어서 실제로는 {fmtScore(result.minimum)}점이 필요해요. 그러면 최종{' '}
        {fmtScore(result.final)}점이 됩니다. (득점률 {percent(result.rate)}%)
      </p>
      {showSteps && (
        <div className="steps">
          <div className="steps__row">
            <span className="steps__label">다른 평가에서 확보/예상</span>
            <span className="steps__value">{fmtScore(result.other)}점</span>
          </div>
          <div className="steps__row">
            <span className="steps__label">목표까지 더 필요한 몫</span>
            <span className="steps__value">{fmtScore(Q.of(target).sub(result.other))}점</span>
          </div>
          <div className="steps__row">
            <span className="steps__label">
              원점수로 환산 (× {item.max} ÷ {item.weight}%)
            </span>
            <span className="steps__value">{result.theory.toDecimal(4)}점</span>
          </div>
          <div className="steps__row">
            <span className="steps__label">{item.step}점 단위로 올림</span>
            <span className="steps__value">{fmtScore(result.minimum)}점</span>
          </div>
          <div className="steps__row steps__row--total">
            <span className="steps__label">최종 점수</span>
            <span className="steps__value">{fmtScore(result.final)}점</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- 같은 득점률 시나리오 */

function EvenPanel({ subject }: { subject: Subject }) {
  const result = useMemo(
    () => evenScenario(subject.items, subject.target),
    [subject.items, subject.target],
  );

  if (result.kind === 'already') {
    return (
      <div className="result result--ok">
        <p className="result__headline">이미 목표에 도달했어요.</p>
        <p className="result__note">남은 평가에서 0점을 받아도 목표를 유지합니다.</p>
      </div>
    );
  }
  if (result.kind === 'impossible') {
    return (
      <div className="result result--bad">
        <p className="result__headline">남은 평가를 다 만점 받아도 부족해요.</p>
        <div className="result__big">
          <span className="result__big-value">{fmtScore(result.best)}</span>
          <span className="result__big-unit">점이 최대</span>
        </div>
        <p className="result__note">{fmtScore(result.shortfall)}점이 모자랍니다.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="result result--ok">
        <p className="result__headline">남은 평가를 모두 같은 비율로 받는다면</p>
        <div className="result__big">
          <span className="result__big-value">{percent(result.rate)}</span>
          <span className="result__big-unit">% 씩</span>
        </div>
        <p className="result__note">이렇게 받으면 최종 {fmtScore(result.final)}점이 됩니다.</p>
      </div>
      <div className="card">
        <div className="card__body">
          <div className="steps">
            {result.scores.map((row) => (
              <div key={row.id} className="steps__row">
                <span className="steps__label">{row.name || '이름 없음'}</span>
                <span className="steps__value">
                  {fmtScore(row.score)} / {fmtScore(row.max)}점
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 시뮬레이터 */

function SimulatePanel({ subject }: { subject: Subject }) {
  const pending = useMemo(
    () => subject.items.filter((i) => i.status !== 'confirmed'),
    [subject.items],
  );
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // 평가 구성이 바뀌면 가정값을 초기화한다.
  useEffect(() => {
    setOverrides({});
  }, [subject.id, pending.length]);

  const values = useMemo(() => {
    const out: Record<string, string> = {};
    for (const item of pending) {
      out[item.id] = overrides[item.id] ?? (item.status === 'expected' ? item.score || '0' : '0');
    }
    return out;
  }, [pending, overrides]);

  const total = useMemo(() => simulate(subject.items, values), [subject.items, values]);
  const target = Q.parse(subject.target);
  const grade = gradeFor(total, subject.cuts);
  const reached = target ? total.gte(target) : false;

  if (pending.length === 0) {
    return (
      <div className="card">
        <Empty
          icon="check-circle"
          title="확정되지 않은 평가가 없어요"
          description="조절할 평가가 없습니다."
        />
      </div>
    );
  }

  const setAll = (ratio: number) => {
    const next: Record<string, string> = {};
    for (const item of pending) {
      const max = Q.parse(item.max) ?? ZERO;
      const step = Q.parse(item.step) ?? Q.of(1);
      next[item.id] = Q.min(max.mul(Q.of(ratio)).floorToStep(step), max).toDecimal(2);
    }
    setOverrides(next);
  };

  return (
    <div className="stack">
      <div className={`result ${reached ? 'result--ok' : 'result--warn'}`}>
        <p className="result__headline">이렇게 받으면</p>
        <div className="result__big">
          <span className="result__big-value">{fmtScore(total)}</span>
          <span className="result__big-unit">점{grade ? ` · ${grade.name}` : ''}</span>
        </div>
        <Meter value={total.toNumber()} marks={target ? [target.toNumber()] : []} />
        <p className="result__note">
          {target
            ? reached
              ? `목표 ${fmtScore(target)}점을 ${fmtScore(total.sub(target))}점 넘습니다.`
              : `목표 ${fmtScore(target)}점까지 ${fmtScore(target.sub(total))}점 모자랍니다.`
            : '목표 점수를 정하면 달성 여부도 같이 보여 드려요.'}
        </p>
      </div>

      <div className="chip-row" role="group" aria-label="일괄 설정">
        <button type="button" className="chip" onClick={() => setAll(1)}>
          전부 만점
        </button>
        <button type="button" className="chip" onClick={() => setAll(0.9)}>
          90%
        </button>
        <button type="button" className="chip" onClick={() => setAll(0.8)}>
          80%
        </button>
        <button type="button" className="chip" onClick={() => setAll(0)}>
          전부 0점
        </button>
        <button type="button" className="chip" onClick={() => setOverrides({})}>
          되돌리기
        </button>
      </div>

      <div className="card">
        <div className="card__body">
          {pending.map((item) => {
            const max = Q.parse(item.max) ?? Q.of(100);
            const step = Q.parse(item.step) ?? Q.of(1);
            const current = Q.parse(values[item.id] ?? '0') ?? ZERO;
            const pct = max.isZero() ? 0 : (current.toNumber() / max.toNumber()) * 100;
            return (
              <div key={item.id} className="sim-row">
                <div className="sim-row__head">
                  <span className="sim-row__name">{item.name || '이름 없음'}</span>
                  <span className="sim-row__value">
                    {fmtScore(current)} / {fmtScore(max)}점
                  </span>
                </div>
                <input
                  className="slider"
                  style={{ ['--pct' as string]: `${pct}%` }}
                  type="range"
                  min={0}
                  max={max.toNumber()}
                  step={step.toNumber()}
                  value={current.toNumber()}
                  aria-label={`${item.name} 가정 점수`}
                  onChange={(event) =>
                    setOverrides((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                />
                <span className="sim-row__sub">
                  반영 {item.weight}% · 이 점수면 +
                  {fmtScore(contribution(item, current.toDecimal(10)))}점
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
