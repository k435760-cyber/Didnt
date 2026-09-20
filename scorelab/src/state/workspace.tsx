/**
 * 워크스페이스 저장소.
 *
 * 진실의 원천은 메모리에 있는 Workspace 하나뿐이고, 로컬 저장과 클라우드는
 * 그 뒤를 따라간다. 모든 변경은 reducer 를 통과하므로 어떤 조작이 무엇을
 * 바꾸는지 한곳에서 읽을 수 있다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  LIMITS,
  makeEvaluation,
  type Evaluation,
  type Subject,
  type Workspace,
} from '../lib/engine';
import { loadWorkspace, saveWorkspace, type LoadResult } from '../lib/storage';
import { rememberDeletion } from '../lib/sync';

type Action =
  | { type: 'replace'; workspace: Workspace }
  | { type: 'active'; id: string }
  | { type: 'subject/add'; subject: Subject }
  | { type: 'subject/patch'; id: string; patch: Partial<Subject> }
  | { type: 'subject/remove'; id: string }
  | { type: 'subject/restore'; subject: Subject; index: number }
  | { type: 'item/add'; subjectId: string; item: Evaluation }
  | { type: 'item/patch'; subjectId: string; itemId: string; patch: Partial<Evaluation> }
  | { type: 'item/remove'; subjectId: string; itemId: string }
  | { type: 'item/move'; subjectId: string; itemId: string; delta: number };

const stamp = () => new Date().toISOString();

/** 과목을 건드렸으면 updatedAt 을 올린다. 동기화가 이 값으로 최신을 가린다. */
function touchSubject(
  workspace: Workspace,
  id: string,
  change: (subject: Subject) => Subject,
): Workspace {
  return {
    ...workspace,
    subjects: workspace.subjects.map((s) =>
      s.id === id ? { ...change(s), updatedAt: stamp() } : s,
    ),
    updatedAt: stamp(),
  };
}

export function reducer(state: Workspace, action: Action): Workspace {
  switch (action.type) {
    case 'replace':
      return action.workspace;

    case 'active':
      return state.subjects.some((s) => s.id === action.id)
        ? { ...state, activeId: action.id }
        : state;

    case 'subject/add': {
      if (state.subjects.length >= LIMITS.subjects) return state;
      return {
        ...state,
        subjects: [action.subject, ...state.subjects],
        activeId: action.subject.id,
        updatedAt: stamp(),
      };
    }

    case 'subject/patch':
      return touchSubject(state, action.id, (s) => ({ ...s, ...action.patch }));

    case 'subject/remove': {
      const subjects = state.subjects.filter((s) => s.id !== action.id);
      const activeId = state.activeId === action.id ? (subjects[0]?.id ?? '') : state.activeId;
      return { ...state, subjects, activeId, updatedAt: stamp() };
    }

    case 'subject/restore': {
      const subjects = [...state.subjects];
      subjects.splice(Math.min(action.index, subjects.length), 0, action.subject);
      return { ...state, subjects, activeId: action.subject.id, updatedAt: stamp() };
    }

    case 'item/add':
      return touchSubject(state, action.subjectId, (s) =>
        s.items.length >= LIMITS.items ? s : { ...s, items: [...s.items, action.item] },
      );

    case 'item/patch':
      return touchSubject(state, action.subjectId, (s) => ({
        ...s,
        items: s.items.map((i) => (i.id === action.itemId ? { ...i, ...action.patch } : i)),
      }));

    case 'item/remove':
      return touchSubject(state, action.subjectId, (s) => ({
        ...s,
        items: s.items.filter((i) => i.id !== action.itemId),
      }));

    case 'item/move':
      return touchSubject(state, action.subjectId, (s) => {
        const index = s.items.findIndex((i) => i.id === action.itemId);
        const next = index + action.delta;
        if (index < 0 || next < 0 || next >= s.items.length) return s;
        const items = [...s.items];
        const [moved] = items.splice(index, 1);
        items.splice(next, 0, moved!);
        return { ...s, items };
      });

    default:
      return state;
  }
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface WorkspaceApi {
  workspace: Workspace;
  activeSubject: Subject | null;
  saveState: SaveState;
  /** 시작할 때 저장본을 읽다가 생긴 문제 (손상 등) */
  loadIssue: LoadResult | null;
  dismissLoadIssue: () => void;
  dispatch: (action: Action) => void;
  /** 자주 쓰는 조작들. 한도에 걸리면 false 를 돌려준다. */
  addSubject: (subject: Subject) => boolean;
  removeSubject: (id: string) => { subject: Subject; index: number } | null;
  restoreSubject: (subject: Subject, index: number) => void;
  patchSubject: (id: string, patch: Partial<Subject>) => void;
  addItem: (subjectId: string, patch?: Partial<Evaluation>) => Evaluation | null;
  patchItem: (subjectId: string, itemId: string, patch: Partial<Evaluation>) => void;
  removeItem: (subjectId: string, itemId: string) => void;
  moveItem: (subjectId: string, itemId: string, delta: number) => void;
  replaceWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const api = useContext(WorkspaceContext);
  if (!api) throw new Error('useWorkspace 는 WorkspaceProvider 안에서만 쓸 수 있습니다.');
  return api;
}

const initialLoad = (): { workspace: Workspace; issue: LoadResult | null } => {
  const result = loadWorkspace();
  return { workspace: result.workspace, issue: result.status === 'corrupt' ? result : null };
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(initialLoad);
  const [workspace, dispatch] = useReducer(reducer, boot.workspace);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loadIssue, setLoadIssue] = useState<LoadResult | null>(boot.issue);
  const first = useRef(true);

  // 입력 중 매 글자마다 저장하지 않도록 잠깐 모아서 저장한다.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState('saving');
    const timer = setTimeout(() => {
      setSaveState(saveWorkspace(workspace) ? 'saved' : 'error');
    }, 400);
    return () => clearTimeout(timer);
  }, [workspace]);

  // "저장됨" 표시는 잠깐만 보여 준다.
  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = setTimeout(() => setSaveState('idle'), 1600);
    return () => clearTimeout(timer);
  }, [saveState]);

  const activeSubject = useMemo(
    () =>
      workspace.subjects.find((s) => s.id === workspace.activeId) ?? workspace.subjects[0] ?? null,
    [workspace],
  );

  const removeSubject = useCallback(
    (id: string) => {
      const index = workspace.subjects.findIndex((s) => s.id === id);
      const subject = workspace.subjects[index];
      if (!subject) return null;
      rememberDeletion(id);
      dispatch({ type: 'subject/remove', id });
      return { subject, index };
    },
    [workspace.subjects],
  );

  const addSubject = useCallback(
    (subject: Subject) => {
      if (workspace.subjects.length >= LIMITS.subjects) return false;
      dispatch({ type: 'subject/add', subject });
      return true;
    },
    [workspace.subjects.length],
  );

  const addItem = useCallback(
    (subjectId: string, patch: Partial<Evaluation> = {}) => {
      const subject = workspace.subjects.find((s) => s.id === subjectId);
      if (!subject || subject.items.length >= LIMITS.items) return null;
      const item = makeEvaluation(patch);
      dispatch({ type: 'item/add', subjectId, item });
      return item;
    },
    [workspace.subjects],
  );

  const api = useMemo<WorkspaceApi>(
    () => ({
      workspace,
      activeSubject,
      saveState,
      loadIssue,
      dismissLoadIssue: () => setLoadIssue(null),
      dispatch,
      addSubject,
      removeSubject,
      restoreSubject: (subject, index) => dispatch({ type: 'subject/restore', subject, index }),
      patchSubject: (id, patch) => dispatch({ type: 'subject/patch', id, patch }),
      addItem,
      patchItem: (subjectId, itemId, patch) =>
        dispatch({ type: 'item/patch', subjectId, itemId, patch }),
      removeItem: (subjectId, itemId) => dispatch({ type: 'item/remove', subjectId, itemId }),
      moveItem: (subjectId, itemId, delta) =>
        dispatch({ type: 'item/move', subjectId, itemId, delta }),
      replaceWorkspace: (next) => dispatch({ type: 'replace', workspace: next }),
    }),
    [workspace, activeSubject, saveState, loadIssue, addSubject, removeSubject, addItem],
  );

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}
