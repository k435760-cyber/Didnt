/** 한 과목의 상세 화면: 현재 점수, 평가 목록, 기여도. */
import { useMemo } from 'react';
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  contribution,
  evaluationErrors,
  gradeFor,
  hasErrors,
  nextGradeGap,
  subjectIssues,
  summarize,
  type Evaluation,
  type Subject,
} from '../../lib/engine';
import { Q, ZERO } from '../../lib/rational';
import { boundaryAware, hueVar, score as fmtScore, subjectColor } from '../../lib/format';
import { Icon } from '../../ui/Icon';
import { Banner, Empty, Meter } from '../../ui/primitives';
import { useSubjectActions } from './actions';

export function SubjectScreen({ subject }: { subject: Subject }) {
  const actions = useSubjectActions();
  const summary = useMemo(() => summarize(subject.items), [subject.items]);
  const issues = useMemo(() => subjectIssues(subject), [subject]);
  const target = Q.parse(subject.target);
  const cutValues = useMemo(
    () =>
      subject.cuts.flatMap((c) => {
        const q = Q.parse(c.lower);
        return q ? [q] : [];
      }),
    [subject.cuts],
  );

  const grade = gradeFor(summary.projected, subject.cuts);
  const nextCut = nextGradeGap(summary.projected, subject.cuts);
  const color = subjectColor(subject);

  return (
    <div className="page" style={{ ['--subject-color' as string]: color }}>
      <header className="page__head">
        <div style={{ minWidth: 0 }}>
          <h1 className="page__title">{subject.name}</h1>
          <p className="page__sub">
            평가 {subject.items.length}개 · 반영 비율 합계 {fmtScore(summary.weightTotal)}%
          </p>
        </div>
        <div className="row" style={{ gap: 6, flex: 'none' }}>
          <button
            type="button"
            className="btn btn--sm btn--icon"
            aria-label="과목 설정"
            onClick={() => void actions.editSubject(subject)}
          >
            <Icon name="settings" size={18} />
          </button>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => void actions.createEvaluation(subject)}
          >
            <Icon name="plus" size={17} />
            평가
          </button>
        </div>
      </header>

      {issues.map((issue) => (
        <Banner key={issue.message} tone={issue.level === 'error' ? 'bad' : 'warn'}>
          {issue.message}
        </Banner>
      ))}

      <div className="split">
        <div className="split__col">
          <section className="hero">
            <div className="hero__top">
              <div style={{ minWidth: 0 }}>
                <p className="hero__label">현재 점수</p>
                <div className="hero__score">
                  <span className="hero__value">{boundaryAware(summary.projected, cutValues)}</span>
                  <span className="hero__unit">점</span>
                </div>
              </div>
              {grade && (
                <div className="hero__grade" title={`${grade.name} (${grade.lower}점 이상)`}>
                  {grade.name}
                </div>
              )}
            </div>

            <div className="hero__meter">
              <Meter
                value={summary.projected.toNumber()}
                marks={target ? [target.toNumber()] : []}
              />
              <div className="hero__meter-labels">
                <span>0</span>
                {target && <span>목표 {fmtScore(target)}</span>}
                <span>100</span>
              </div>
            </div>

            <div className="hero__range">
              <span>
                확정만: <b>{fmtScore(summary.secured)}점</b>
              </span>
              <span>
                최저: <b>{fmtScore(summary.floor)}점</b>
              </span>
              <span>
                최고: <b>{fmtScore(summary.ceiling)}점</b>
              </span>
            </div>

            {nextCut && (
              <div className="banner banner--info" style={{ marginTop: 2 }}>
                <span className="banner__icon">
                  <Icon name="trending" size={16} />
                </span>
                <span className="banner__text">
                  {nextCut.cut.name} 까지 <b>{fmtScore(nextCut.gap)}점</b> 남았어요.
                </span>
              </div>
            )}
          </section>

          <section className="section">
            <div className="section__head">
              <span className="section__title">
                <Icon name="book" size={15} />
                평가 {subject.items.length}개
              </span>
              {subject.items.length > 0 && (
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => void actions.createEvaluation(subject)}
                >
                  <Icon name="plus" size={16} />
                  추가
                </button>
              )}
            </div>

            {subject.items.length === 0 ? (
              <div className="card">
                <Empty
                  icon="book"
                  title="아직 평가가 없어요"
                  description="지필고사·수행평가를 추가하면 반영 비율에 맞춰 점수를 계산합니다."
                  action={
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => void actions.createEvaluation(subject)}
                    >
                      <Icon name="plus" size={17} />첫 평가 추가
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="eval-list">
                {subject.items.map((item) => (
                  <EvaluationRow
                    key={item.id}
                    item={item}
                    onOpen={() => void actions.editEvaluation(subject, item)}
                    onQuickScore={() => void actions.quickScore(subject, item)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="split__col">
          <div className="tiles">
            <Tile
              label="확보 점수"
              icon="lock"
              value={fmtScore(summary.secured)}
              note="확정된 평가만"
            />
            <Tile
              label="예상 포함"
              icon="sparkles"
              value={fmtScore(summary.projected)}
              note={`예상 ${subject.items.filter((i) => i.status === 'expected').length}개 반영`}
            />
            <Tile
              label="남은 비율"
              icon="clock"
              value={`${fmtScore(summary.pendingWeight)}%`}
              note={`평가 ${summary.pending.length}개`}
            />
            <Tile
              label="가능 범위"
              icon="layers"
              value={`${fmtScore(summary.floor)}~${fmtScore(summary.ceiling)}`}
              note="남은 평가 0점~만점"
            />
          </div>

          {subject.items.length > 0 && <ContributionCard items={subject.items} />}
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  icon: Parameters<typeof Icon>[0]['name'];
}) {
  return (
    <div className="tile">
      <span className="tile__label">
        <Icon name={icon} size={14} />
        {label}
      </span>
      <span className="tile__value tile__value--sm">{value}</span>
      {note && <span className="tile__note">{note}</span>}
    </div>
  );
}

function EvaluationRow({
  item,
  onOpen,
  onQuickScore,
}: {
  item: Evaluation;
  onOpen: () => void;
  onQuickScore: () => void;
}) {
  const broken = hasErrors(evaluationErrors(item));
  const max = Q.parse(item.max);
  const scoreQ = Q.parse(item.score);
  const ratio = max && scoreQ && !max.isZero() ? scoreQ.div(max) : ZERO;
  const contrib = broken || item.status === 'missing' ? null : contribution(item);
  const state = broken ? 'invalid' : item.status;

  return (
    <div className={`eval eval--${state}`}>
      <span className="eval__stripe" aria-hidden="true" />
      <button
        type="button"
        className="eval__main"
        onClick={onOpen}
        style={{ background: 'none', textAlign: 'left' }}
      >
        <span className="eval__name">{item.name || '이름 없는 평가'}</span>
        <span className="eval__meta">
          <span className="badge">{CATEGORY_LABEL[item.category]}</span>
          <span>{item.weight}%</span>
          <span aria-hidden="true">·</span>
          <span>만점 {item.max}</span>
          <span className={`badge badge--dot ${badgeTone(state)}`}>
            {broken ? '오류' : STATUS_LABEL[item.status]}
          </span>
        </span>
        {item.status !== 'missing' && !broken && (
          <span className="eval__bar">
            <span
              className="eval__bar-fill"
              style={{ width: `${Math.min(100, ratio.toNumber() * 100)}%` }}
            />
          </span>
        )}
      </button>
      <button
        type="button"
        className="eval__right"
        onClick={onQuickScore}
        aria-label={`${item.name} 점수 입력`}
        style={{ background: 'none' }}
      >
        {item.status === 'missing' || !scoreQ ? (
          <span className="eval__score eval__score--muted">— 점</span>
        ) : (
          <span className="eval__score">{fmtScore(scoreQ)}</span>
        )}
        {contrib && <span className="eval__contrib">+{fmtScore(contrib)}점</span>}
      </button>
    </div>
  );
}

const badgeTone = (state: string) =>
  state === 'confirmed'
    ? 'badge--ok'
    : state === 'expected'
      ? 'badge--warn'
      : state === 'invalid'
        ? 'badge--bad'
        : '';

function ContributionCard({ items }: { items: Evaluation[] }) {
  const parts = items.map((item, index) => {
    const weight = Q.parse(item.weight) ?? ZERO;
    const earned =
      item.status === 'missing' || hasErrors(evaluationErrors(item)) ? ZERO : contribution(item);
    return { item, weight, earned, color: hueVar(index) };
  });
  const total = parts.reduce((sum, p) => sum.add(p.weight), ZERO);
  if (total.isZero()) return null;

  return (
    <section className="card">
      <div className="card__head">
        <span className="card__title">기여도</span>
        <span className="card__sub">평가별로 최종 점수에 실제 들어간 몫</span>
      </div>
      <div className="card__body stack">
        <div className="contrib" role="img" aria-label="평가별 기여도">
          {parts.map((part) => (
            <span
              key={part.item.id}
              className="contrib__seg"
              style={{
                flexGrow: part.weight.toNumber() || 0.0001,
                background: `linear-gradient(90deg, ${part.color} ${
                  part.weight.isZero() ? 0 : part.earned.div(part.weight).toNumber() * 100
                }%, color-mix(in srgb, ${part.color} 18%, transparent) 0)`,
              }}
              title={`${part.item.name}: ${fmtScore(part.earned)} / ${fmtScore(part.weight)}`}
            />
          ))}
        </div>
        <div className="contrib-legend">
          {parts.map((part) => (
            <span key={part.item.id} className="contrib-legend__item">
              <span className="contrib-legend__swatch" style={{ background: part.color }} />
              {part.item.name || '이름 없음'} {fmtScore(part.earned)}/{fmtScore(part.weight)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
