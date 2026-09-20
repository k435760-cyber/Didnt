/** 평가 추가·편집 모달. 입력하는 동안 결과가 어떻게 바뀌는지 바로 보여 준다. */
import { useMemo, useState } from 'react';
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  contribution,
  evaluationErrors,
  hasErrors,
  isValidScore,
  type Category,
  type Evaluation,
  type Status,
} from '../../lib/engine';
import { Q } from '../../lib/rational';
import { score as fmtScore } from '../../lib/format';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Field, Segmented } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';

interface Props {
  initial: Evaluation;
  /** 이 과목의 나머지 평가들이 이미 쓰고 있는 비율 (합계 안내용) */
  otherWeight: Q;
  mode: 'create' | 'edit';
  onSubmit: (item: Evaluation) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const CATEGORIES: Category[] = ['written', 'performance', 'etc'];
const STATUSES: Status[] = ['confirmed', 'expected', 'missing'];

const STEP_PRESETS = ['1', '0.5', '0.1', '0.25'];

export function EvaluationModal({
  initial,
  otherWeight,
  mode,
  onSubmit,
  onDelete,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<Evaluation>(initial);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => evaluationErrors(draft), [draft]);
  const invalid = hasErrors(errors);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : undefined);

  const patch = (next: Partial<Evaluation>) => setDraft((current) => ({ ...current, ...next }));

  const weightQ = Q.parse(draft.weight);
  const total = weightQ ? otherWeight.add(weightQ) : otherWeight;
  const totalOff = !total.eq(Q.of(100));

  const contrib = !invalid && draft.status !== 'missing' ? contribution(draft) : null;

  // 점수 칸 아래에 "이 점수면 최종에 몇 점" 을 띄워 준다.
  const scoreQ = Q.parse(draft.score);
  const maxQ = Q.parse(draft.max);
  const stepHint =
    scoreQ && maxQ && !errors.max && !errors.step && !isValidScore(scoreQ, draft)
      ? `${draft.step}점 단위가 아니에요`
      : undefined;

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    // 미입력으로 두면 점수는 기억만 하고 계산에서는 빠진다.
    onSubmit(draft);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ModalHead
        title={mode === 'create' ? '평가 추가' : '평가 수정'}
        description="반영 비율과 만점을 넣으면 최종 점수에 얼마나 기여하는지 바로 계산됩니다."
        icon={mode === 'create' ? 'plus' : 'pencil'}
        onClose={onCancel}
      />
      <ModalBody>
        <Field label="평가 이름" error={show('name')}>
          <input
            className="input"
            data-autofocus
            value={draft.name}
            maxLength={40}
            placeholder="예: 1학기 기말고사"
            aria-invalid={show('name') ? 'true' : undefined}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>

        <Field label="분류">
          <Segmented
            block
            label="평가 분류"
            value={draft.category}
            options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
            onChange={(category) => patch({ category })}
          />
        </Field>

        <div className="form-grid form-grid--3">
          <Field
            label="반영 비율"
            unit="%"
            error={show('weight')}
            hint={totalOff && weightQ ? `합계 ${fmtScore(total)}%` : undefined}
          >
            <input
              className="input input--num"
              inputMode="decimal"
              value={draft.weight}
              aria-invalid={show('weight') ? 'true' : undefined}
              onChange={(event) => patch({ weight: event.target.value })}
            />
          </Field>
          <Field label="만점" unit="점" error={show('max')}>
            <input
              className="input input--num"
              inputMode="decimal"
              value={draft.max}
              aria-invalid={show('max') ? 'true' : undefined}
              onChange={(event) => patch({ max: event.target.value })}
            />
          </Field>
          <Field label="입력 간격" unit="점" error={show('step')}>
            <input
              className="input input--num"
              inputMode="decimal"
              value={draft.step}
              aria-invalid={show('step') ? 'true' : undefined}
              onChange={(event) => patch({ step: event.target.value })}
            />
          </Field>
        </div>

        <div className="chip-row" role="group" aria-label="자주 쓰는 입력 간격">
          {STEP_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="chip"
              aria-pressed={draft.step === preset}
              onClick={() => patch({ step: preset })}
            >
              {preset}점 단위
            </button>
          ))}
        </div>

        <hr className="divider" />

        <Field label="상태">
          <Segmented
            block
            label="평가 상태"
            value={draft.status}
            options={STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }))}
            onChange={(status) => patch({ status })}
          />
        </Field>

        <p className="muted" style={{ marginTop: -4 }}>
          {draft.status === 'confirmed' && '받은 점수가 확정된 평가입니다. 확보 점수에 들어갑니다.'}
          {draft.status === 'expected' && '아직 확정은 아니지만 예상 점수를 반영해 계산합니다.'}
          {draft.status === 'missing' &&
            '계산에서 빠집니다. 적어 둔 점수는 지워지지 않고 기억해 둡니다.'}
        </p>

        <Field
          label={draft.status === 'missing' ? '점수 (기억만 함)' : '받은 점수'}
          unit="점"
          error={show('score')}
          hint={stepHint}
        >
          <input
            className="input input--num"
            inputMode="decimal"
            value={draft.score}
            placeholder={draft.status === 'missing' ? '비워 둘 수 있어요' : '0'}
            aria-invalid={show('score') ? 'true' : undefined}
            onChange={(event) => patch({ score: event.target.value })}
          />
        </Field>

        {contrib && (
          <div className="result">
            <div className="steps">
              <div className="steps__row">
                <span className="steps__label">
                  {fmtScore(scoreQ ?? Q.of(0))} ÷ {draft.max} × {draft.weight}%
                </span>
                <span className="steps__value">환산</span>
              </div>
              <div className="steps__row steps__row--total">
                <span className="steps__label">최종 점수 기여</span>
                <span className="steps__value">{fmtScore(contrib)}점</span>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        {onDelete && (
          <button
            type="button"
            className="btn btn--danger btn--icon"
            style={{ flex: 'none' }}
            aria-label="이 평가 삭제"
            onClick={onDelete}
          >
            <Icon name="trash" size={17} />
          </button>
        )}
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
