/** 과목·평가 관련 흐름(모달 → 확인 → 저장)을 한곳에 모았다. 화면들은 이걸 부른다. */
import { useCallback } from 'react';
import {
  LIMITS,
  cloneSubject,
  evaluationErrors,
  makeCuts,
  makeEvaluation,
  makeSubject,
  weightTotal,
  type Evaluation,
  type Subject,
} from '../../lib/engine';
import { Q } from '../../lib/rational';
import { useWorkspace } from '../../state/workspace';
import { useModal } from '../../ui/ModalProvider';
import { useToast } from '../../ui/Toast';
import { EvaluationModal } from './EvaluationModal';
import { SubjectModal } from './SubjectModal';

export function useSubjectActions() {
  const {
    workspace,
    addSubject,
    patchSubject,
    removeSubject,
    restoreSubject,
    addItem,
    patchItem,
    removeItem,
    dispatch,
  } = useWorkspace();
  const modal = useModal();
  const toast = useToast();

  /** 과목 한도를 넘었으면 이유를 알리고 false 를 돌려준다. */
  const ensureRoom = useCallback(async () => {
    if (workspace.subjects.length < LIMITS.subjects) return true;
    await modal.alert({
      title: '과목을 더 추가할 수 없어요',
      description: `과목은 ${LIMITS.subjects}개까지 만들 수 있습니다. 쓰지 않는 과목을 지우고 다시 시도해 주세요.`,
      tone: 'warn',
      icon: 'alert',
    });
    return false;
  }, [workspace.subjects.length, modal]);

  const createSubject = useCallback(async () => {
    if (!(await ensureRoom())) return null;
    const base = makeSubject({ hue: workspace.subjects.length % 12, cuts: makeCuts(), name: '' });
    const result = await modal.open<Pick<Subject, 'name' | 'memo' | 'hue' | 'target' | 'cuts'>>(
      ({ close }) => (
        <SubjectModal
          initial={base}
          mode="create"
          onSubmit={(patch) => close(patch)}
          onCancel={() => close()}
        />
      ),
      { size: 'md' },
    );
    if (!result) return null;
    const subject = makeSubject({ ...base, ...result });
    if (!addSubject(subject)) return null;
    toast.ok(`"${subject.name}" 과목을 추가했어요.`);
    return subject;
  }, [workspace.subjects.length, ensureRoom, modal, addSubject, toast]);

  const editSubject = useCallback(
    async (subject: Subject) => {
      const result = await modal.open<Pick<Subject, 'name' | 'memo' | 'hue' | 'target' | 'cuts'>>(
        ({ close }) => (
          <SubjectModal
            initial={subject}
            mode="edit"
            onSubmit={(patch) => close(patch)}
            onCancel={() => close()}
          />
        ),
        { size: 'md' },
      );
      if (!result) return;
      patchSubject(subject.id, result);
      toast.ok('과목 설정을 저장했어요.');
    },
    [modal, patchSubject, toast],
  );

  const duplicateSubject = useCallback(
    async (subject: Subject) => {
      if (!(await ensureRoom())) return;
      const copy = cloneSubject(subject);
      if (!addSubject(copy)) return;
      toast.ok(`"${copy.name}" 으로 복제했어요.`);
    },
    [ensureRoom, addSubject, toast],
  );

  const deleteSubject = useCallback(
    async (subject: Subject) => {
      const confirmed = await modal.confirm({
        title: '과목을 삭제할까요?',
        description: `"${subject.name}" 과 안에 있는 평가 ${subject.items.length}개가 지워집니다.`,
        confirmText: '삭제',
        destructive: true,
      });
      if (!confirmed) return;
      const removed = removeSubject(subject.id);
      if (!removed) return;
      toast.show(`"${subject.name}" 을 삭제했어요.`, {
        tone: 'default',
        action: {
          label: '실행 취소',
          onClick: () => restoreSubject(removed.subject, removed.index),
        },
      });
    },
    [modal, removeSubject, restoreSubject, toast],
  );

  const createEvaluation = useCallback(
    async (subject: Subject) => {
      const used = weightTotal(subject.items);
      const room = Q.max(Q.of(100).sub(used), Q.of(0));
      const draft = makeEvaluation({
        name: '',
        weight: room.toDecimal(2),
        category: subject.items.at(-1)?.category ?? 'performance',
      });
      const result = await modal.open<Evaluation>(
        ({ close }) => (
          <EvaluationModal
            initial={draft}
            otherWeight={used}
            mode="create"
            onSubmit={(item) => close(item)}
            onCancel={() => close()}
          />
        ),
        { size: 'md' },
      );
      if (!result) return;
      const created = addItem(subject.id, result);
      if (!created) {
        await modal.alert({
          title: '평가를 더 추가할 수 없어요',
          description: '한 과목에 넣을 수 있는 평가 수를 넘었습니다.',
          tone: 'warn',
          icon: 'alert',
        });
        return;
      }
      toast.ok(`"${result.name}" 평가를 추가했어요.`);
    },
    [modal, addItem, toast],
  );

  const editEvaluation = useCallback(
    async (subject: Subject, item: Evaluation) => {
      const others = weightTotal(subject.items.filter((i) => i.id !== item.id));
      const action = await modal.open<{ kind: 'save'; item: Evaluation } | { kind: 'delete' }>(
        ({ close }) => (
          <EvaluationModal
            initial={item}
            otherWeight={others}
            mode="edit"
            onSubmit={(next) => close({ kind: 'save', item: next })}
            onDelete={() => close({ kind: 'delete' })}
            onCancel={() => close()}
          />
        ),
        { size: 'md' },
      );
      if (!action) return;
      if (action.kind === 'save') {
        patchItem(subject.id, item.id, action.item);
        return;
      }
      const confirmed = await modal.confirm({
        title: '평가를 삭제할까요?',
        description: `"${item.name}" 이 목록에서 빠집니다.`,
        confirmText: '삭제',
        destructive: true,
      });
      if (!confirmed) return;
      removeItem(subject.id, item.id);
      toast.show(`"${item.name}" 을 삭제했어요.`, {
        action: {
          label: '실행 취소',
          onClick: () => dispatch({ type: 'item/add', subjectId: subject.id, item }),
        },
      });
    },
    [modal, patchItem, removeItem, toast, dispatch],
  );

  /** 목록에서 바로 점수만 바꾸기 */
  const quickScore = useCallback(
    async (subject: Subject, item: Evaluation) => {
      const value = await modal.prompt({
        title: `${item.name} 점수`,
        description: `만점 ${item.max}점 · ${item.step}점 단위`,
        label: '받은 점수',
        initialValue: item.score,
        placeholder: '0',
        confirmText: '저장',
        // 점수 칸만 검사한다. 나머지 칸은 이미 저장된 값이라 유효하다.
        validate: (input) => evaluationErrors({ ...item, score: input, status: 'confirmed' }).score,
      });
      if (value === null) return;
      patchItem(subject.id, item.id, { score: value, status: 'confirmed' });
    },
    [modal, patchItem],
  );

  return {
    createSubject,
    editSubject,
    duplicateSubject,
    deleteSubject,
    createEvaluation,
    editEvaluation,
    quickScore,
  };
}
