/** 과목 설정 모달. 이름·색·목표 점수·성취도 기준을 한 곳에서 고친다. */
import { useMemo, useState } from 'react';
import {
  DEFAULT_CUTS,
  LIMITS,
  cutErrors,
  decimalError,
  makeCuts,
  uid,
  type GradeCut,
  type Subject,
} from '../../lib/engine';
import { hueVar } from '../../lib/format';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Field } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';

interface Props {
  initial: Subject;
  mode: 'create' | 'edit';
  onSubmit: (patch: Pick<Subject, 'name' | 'memo' | 'hue' | 'target' | 'cuts'>) => void;
  onCancel: () => void;
}

const HUES = Array.from({ length: 12 }, (_, index) => index);

export function SubjectModal({ initial, mode, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [memo, setMemo] = useState(initial.memo);
  const [hue, setHue] = useState(initial.hue);
  const [target, setTarget] = useState(initial.target);
  const [cuts, setCuts] = useState<GradeCut[]>(initial.cuts);
  const [touched, setTouched] = useState(false);

  const nameError = !name.trim()
    ? '과목 이름을 입력해 주세요.'
    : name.length > LIMITS.subjectName
      ? `${LIMITS.subjectName}자 이내로 입력해 주세요.`
      : undefined;
  const targetError = decimalError(target);
  const cutProblems = useMemo(() => cutErrors(cuts), [cuts]);
  const invalid = Boolean(nameError || targetError) || cutProblems.length > 0;

  const patchCut = (id: string, patch: Partial<GradeCut>) =>
    setCuts((current) => current.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    onSubmit({ name: name.trim(), memo, hue, target, cuts });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ModalHead
        title={mode === 'create' ? '과목 추가' : '과목 설정'}
        description="목표 점수는 역산과 시나리오 계산의 기준이 됩니다."
        icon={mode === 'create' ? 'plus' : 'settings'}
        onClose={onCancel}
      />
      <ModalBody>
        <Field label="과목 이름" error={touched ? nameError : undefined}>
          <input
            className="input"
            data-autofocus
            value={name}
            maxLength={LIMITS.subjectName}
            placeholder="예: 통합사회"
            aria-invalid={touched && nameError ? 'true' : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="색상">
          <div className="hue-picker" role="group" aria-label="과목 색상">
            {HUES.map((value) => (
              <button
                key={value}
                type="button"
                className="hue-picker__swatch"
                style={{ background: hueVar(value) }}
                aria-pressed={hue === value}
                aria-label={`색상 ${value + 1}`}
                onClick={() => setHue(value)}
              >
                {hue === value && (
                  <span
                    style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#fff' }}
                  >
                    <Icon name="check" size={16} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Field>

        <Field label="목표 점수" unit="점" error={touched ? targetError : undefined}>
          <input
            className="input input--num"
            inputMode="decimal"
            value={target}
            aria-invalid={touched && targetError ? 'true' : undefined}
            onChange={(event) => setTarget(event.target.value)}
          />
        </Field>

        <Field label="메모" hint={`${memo.length} / ${LIMITS.memo}`}>
          <textarea
            className="input"
            value={memo}
            maxLength={LIMITS.memo}
            placeholder="반영 비율 출처나 선생님 안내 같은 걸 적어 두세요."
            onChange={(event) => setMemo(event.target.value)}
          />
        </Field>

        <hr className="divider" />

        <div className="section__head">
          <span className="section__title">
            <Icon name="flag" size={15} />
            성취도 기준
          </span>
          {cuts.length === 0 ? (
            <button
              type="button"
              className="btn btn--sm btn--soft"
              onClick={() => setCuts(makeCuts())}
            >
              기본값 넣기
            </button>
          ) : (
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setCuts([])}>
              쓰지 않기
            </button>
          )}
        </div>

        {cuts.length === 0 ? (
          <p className="muted" style={{ marginTop: -4 }}>
            성취도를 넣으면 현재 점수가 어느 등급이고 다음 등급까지 몇 점 남았는지 알려 줍니다.
            학교마다 기준이 다르니 직접 확인해 입력하세요. (기본값:{' '}
            {DEFAULT_CUTS.map((c) => `${c.name} ${c.lower}`).join(' / ')})
          </p>
        ) : (
          <div className="stack stack--tight">
            {cuts.map((cut, index) => (
              <div key={cut.id} className="row" style={{ gap: 8 }}>
                <input
                  className="input input--sm"
                  style={{ maxWidth: 96 }}
                  value={cut.name}
                  maxLength={LIMITS.cutName}
                  aria-label={`${index + 1}번째 성취도 이름`}
                  onChange={(event) => patchCut(cut.id, { name: event.target.value })}
                />
                <span className="muted" style={{ flex: 'none' }}>
                  ≥
                </span>
                <span className="input-affix" style={{ flex: 1 }}>
                  <input
                    className="input input--sm input--num"
                    inputMode="decimal"
                    value={cut.lower}
                    aria-label={`${cut.name} 하한`}
                    onChange={(event) => patchCut(cut.id, { lower: event.target.value })}
                  />
                  <span className="input-affix__unit">점</span>
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--icon btn--ghost"
                  aria-label={`${cut.name} 삭제`}
                  onClick={() => setCuts((current) => current.filter((c) => c.id !== cut.id))}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            {cuts.length < LIMITS.cuts && (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() =>
                  setCuts((current) => [
                    ...current.slice(0, -1),
                    { id: uid(), name: `등급${current.length}`, lower: '50' },
                    ...current.slice(-1),
                  ])
                }
              >
                <Icon name="plus" size={16} />
                단계 추가
              </button>
            )}
            {touched &&
              cutProblems.map((problem) => (
                <span key={problem} className="field__error">
                  <Icon name="alert" size={13} />
                  {problem}
                </span>
              ))}
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <button type="button" className="btn" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn--primary" disabled={touched && invalid}>
          {mode === 'create' ? '추가' : '저장'}
        </button>
      </ModalFoot>
    </form>
  );
}
