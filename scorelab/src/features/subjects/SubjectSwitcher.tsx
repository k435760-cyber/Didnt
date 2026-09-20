/** 과목 전환 모달. 상단바의 과목 이름을 누르면 열린다. */
import { overallStats, type Subject } from '../../lib/engine';
import { score as fmtScore, subjectColor } from '../../lib/format';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { Empty } from '../../ui/primitives';

interface Props {
  subjects: Subject[];
  activeId: string;
  onPick: (id: string) => void;
  onCreate: () => void;
  onEdit: (subject: Subject) => void;
  onDuplicate: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
  onClose: () => void;
}

export function SubjectSwitcher({
  subjects,
  activeId,
  onPick,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: Props) {
  const { stats } = overallStats(subjects);

  return (
    <>
      <ModalHead
        title="과목"
        description={`${subjects.length}개`}
        icon="layers"
        onClose={onClose}
      />
      <ModalBody flush>
        {subjects.length === 0 ? (
          <Empty icon="layers" title="과목이 없어요" description="첫 과목을 만들어 보세요." />
        ) : (
          <div className="list">
            {stats.map(({ subject, summary, grade }) => (
              <div key={subject.id} className="list__item" style={{ gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onPick(subject.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                    background: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span
                    className="list__icon"
                    style={{
                      background: `color-mix(in srgb, ${subjectColor(subject)} 18%, transparent)`,
                      color: subjectColor(subject),
                    }}
                  >
                    {subject.id === activeId ? (
                      <Icon name="check" size={17} />
                    ) : (
                      <Icon name="book" size={17} />
                    )}
                  </span>
                  <span className="list__text">
                    <span className="list__title">{subject.name}</span>
                    <span className="list__sub">
                      {fmtScore(summary.projected)}점{grade ? ` · ${grade.name}` : ''} · 평가{' '}
                      {subject.items.length}개
                    </span>
                  </span>
                </button>
                <span className="list__right">
                  <button
                    type="button"
                    className="btn btn--sm btn--icon btn--ghost"
                    aria-label={`${subject.name} 설정`}
                    onClick={() => onEdit(subject)}
                  >
                    <Icon name="settings" size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--icon btn--ghost"
                    aria-label={`${subject.name} 복제`}
                    onClick={() => onDuplicate(subject)}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--icon btn--ghost"
                    aria-label={`${subject.name} 삭제`}
                    onClick={() => onDelete(subject)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <button type="button" className="btn" onClick={onClose}>
          닫기
        </button>
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          <Icon name="plus" size={17} />
          과목 추가
        </button>
      </ModalFoot>
    </>
  );
}
