/** 전체 과목을 한눈에 보는 화면. */
import { useMemo } from 'react';
import { overallStats, type Subject } from '../../lib/engine';
import { Q } from '../../lib/rational';
import { relativeTime, score as fmtScore, subjectColor } from '../../lib/format';
import { Icon } from '../../ui/Icon';
import { Empty, Meter } from '../../ui/primitives';
import { useModal } from '../../ui/ModalProvider';
import { useWorkspace } from '../../state/workspace';
import { AboutModal } from '../settings/AboutModal';
import { useSubjectActions } from '../subjects/actions';

/** 예시 데이터 대신 첫 화면에서 쓰는 방법을 알려 준다. */
const STEPS = [
  {
    title: '과목 만들기',
    body: '과목 이름과 목표 점수, 성취도 기준(A·B·C…)을 정합니다.',
  },
  {
    title: '평가 넣기',
    body: '지필·수행마다 반영 비율(%)과 만점, 입력 간격을 적습니다. 비율 합계는 100% 가 되어야 정확합니다.',
  },
  {
    title: '점수 채우기',
    body: '받은 점수는 확정으로, 아직 모르는 평가는 예상이나 미입력으로 둡니다.',
  },
];

export function DashboardScreen({ onOpenSubject }: { onOpenSubject: (id: string) => void }) {
  const { workspace } = useWorkspace();
  const actions = useSubjectActions();
  const modal = useModal();
  const stats = useMemo(() => overallStats(workspace.subjects), [workspace.subjects]);
  const empty = workspace.subjects.length === 0;

  // 과목을 만들면 바로 그 과목 화면으로 데려간다. 다음에 할 일은 평가를 넣는 것이라서.
  const createSubject = () =>
    void actions.createSubject().then((created) => created && onOpenSubject(created.id));

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">내 성적</h1>
          <p className="page__sub">
            {empty
              ? '과목을 만들면 여기에 한눈에 모입니다'
              : `과목 ${stats.count}개 · 마지막 수정 ${relativeTime(workspace.updatedAt)}`}
          </p>
        </div>
        <button type="button" className="btn btn--sm btn--primary" onClick={createSubject}>
          <Icon name="plus" size={17} />
          과목
        </button>
      </header>

      {empty ? (
        <>
          <div className="card">
            <Empty
              icon="layers"
              title="아직 과목이 없어요"
              description="과목을 만들고 평가를 넣으면 지금 점수와 목표까지 필요한 점수를 계산해 드릴게요."
              action={
                <button type="button" className="btn btn--primary" onClick={createSubject}>
                  <Icon name="plus" size={17} />첫 과목 만들기
                </button>
              }
            />
          </div>

          <section className="card">
            <div className="card__head">
              <span className="card__title">처음이신가요?</span>
              <span className="card__sub">세 단계면 끝납니다</span>
            </div>
            <div className="list">
              {STEPS.map((step, index) => (
                <div key={step.title} className="list__item" style={{ alignItems: 'flex-start' }}>
                  <span className="list__icon">{index + 1}</span>
                  <span className="list__text">
                    <span className="list__title">{step.title}</span>
                    <span className="list__sub" style={{ lineHeight: 1.6 }}>
                      {step.body}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="card__body">
              <button
                type="button"
                className="btn btn--block"
                onClick={() =>
                  void modal.open(({ close }) => <AboutModal onClose={() => close()} />, {
                    size: 'md',
                  })
                }
              >
                <Icon name="info" size={17} />
                계산 방식 자세히 보기
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <span className="tile__label">
                <Icon name="trending" size={14} />
                평균
              </span>
              <span className="tile__value">{fmtScore(stats.average)}</span>
              <span className="tile__note">예상 포함 단순 평균</span>
            </div>
            <div className="tile tile--ok">
              <span className="tile__label">
                <Icon name="check-circle" size={14} />
                목표 달성
              </span>
              <span className="tile__value">{stats.onTrack}</span>
              <span className="tile__note">과목</span>
            </div>
            <div className={`tile${stats.atRisk > 0 ? ' tile--bad' : ''}`}>
              <span className="tile__label">
                <Icon name="alert" size={14} />
                달성 불가
              </span>
              <span className="tile__value">{stats.atRisk}</span>
              <span className="tile__note">만점을 받아도 목표 미달</span>
            </div>
          </div>

          <section className="section">
            <div className="section__head">
              <span className="section__title">
                <Icon name="layers" size={15} />
                과목
              </span>
            </div>
            <div className="subject-grid">
              {stats.stats.map((stat) => (
                <SubjectCard
                  key={stat.subject.id}
                  subject={stat.subject}
                  projected={stat.summary.projected}
                  ceiling={stat.summary.ceiling}
                  target={stat.target}
                  gradeName={stat.grade?.name}
                  reachable={stat.reachable}
                  active={stat.subject.id === workspace.activeId}
                  onOpen={() => onOpenSubject(stat.subject.id)}
                  onEdit={() => void actions.editSubject(stat.subject)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SubjectCard({
  subject,
  projected,
  ceiling,
  target,
  gradeName,
  reachable,
  active,
  onOpen,
  onEdit,
}: {
  subject: Subject;
  projected: Q;
  ceiling: Q;
  target: Q | null;
  gradeName?: string;
  reachable: boolean;
  active: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const reached = target ? projected.gte(target) : false;
  return (
    <div
      className="subject-card"
      data-active={active ? 'true' : 'false'}
      style={{ ['--subject-color' as string]: subjectColor(subject) }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="subject-card__top"
        style={{ background: 'none', width: '100%' }}
      >
        <span style={{ minWidth: 0, textAlign: 'left' }}>
          <span className="subject-card__name" style={{ display: 'block' }}>
            {subject.name}
          </span>
          <span className="subject-card__meta">평가 {subject.items.length}개</span>
        </span>
        {gradeName && (
          <span className="badge badge--brand" style={{ flex: 'none' }}>
            {gradeName}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onOpen}
        style={{ background: 'none', textAlign: 'left', width: '100%' }}
      >
        <span className="subject-card__score">
          <span className="subject-card__value">{fmtScore(projected)}</span>
          <span className="subject-card__unit">점</span>
        </span>
      </button>

      <Meter
        value={projected.toNumber()}
        marks={target ? [target.toNumber()] : []}
        label={`${subject.name} 현재 점수`}
      />

      <div className="subject-card__foot">
        {target ? (
          reached ? (
            <span className="badge badge--ok badge--dot">목표 달성</span>
          ) : reachable ? (
            <span className="badge badge--warn badge--dot">
              목표까지 {fmtScore(target.sub(projected))}점
            </span>
          ) : (
            <span className="badge badge--bad badge--dot">최대 {fmtScore(ceiling)}점</span>
          )
        ) : (
          <span className="badge">목표 없음</span>
        )}
        <button
          type="button"
          className="btn btn--sm btn--icon btn--ghost"
          aria-label={`${subject.name} 설정`}
          onClick={onEdit}
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
    </div>
  );
}
