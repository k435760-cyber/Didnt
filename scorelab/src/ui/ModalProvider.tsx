/**
 * 모달 시스템.
 *
 * 앱 전체에서 window.alert / confirm / prompt 를 쓰지 않는다. 확인·입력·오류·
 * 설정·로그인까지 전부 이 스택을 거친다. 모달은 겹쳐 쌓을 수 있고, 각각
 * 포커스를 가두며, 닫히면 열기 직전에 포커스가 있던 곳으로 돌아간다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './focus';
import { ModalBody, ModalFoot, ModalHead, type ModalTone } from './Modal';
import type { IconName } from './Icon';

export interface ModalOptions {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** ESC 와 배경 클릭으로 닫을 수 있는지. 기본 true */
  dismissible?: boolean;
  /** 모바일에서 화면 전체를 쓰는 모달 */
  full?: boolean;
}

export interface ModalControl<T> {
  close: (value?: T) => void;
}

export type ModalRender<T> = (control: ModalControl<T>) => ReactNode;

interface Entry {
  id: number;
  render: ModalRender<unknown>;
  options: Required<Pick<ModalOptions, 'size' | 'dismissible'>> & { full: boolean };
  resolve: (value: unknown) => void;
  closing: boolean;
}

export interface AlertOptions {
  title: ReactNode;
  description?: ReactNode;
  body?: ReactNode;
  tone?: ModalTone;
  icon?: IconName;
  confirmText?: string;
  size?: ModalOptions['size'];
}

export interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
  /** 확인 버튼을 위험(빨강)으로 */
  destructive?: boolean;
}

export interface PromptOptions extends AlertOptions {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  maxLength?: number;
  multiline?: boolean;
  cancelText?: string;
  /** 값이 유효하지 않으면 오류 문구를 돌려준다. */
  validate?: (value: string) => string | undefined;
}

export interface ModalApi {
  open<T = void>(render: ModalRender<T>, options?: ModalOptions): Promise<T | undefined>;
  alert(options: AlertOptions): Promise<void>;
  confirm(options: ConfirmOptions): Promise<boolean>;
  prompt(options: PromptOptions): Promise<string | null>;
  closeAll(): void;
}

const ModalContext = createContext<ModalApi | null>(null);

export function useModal(): ModalApi {
  const api = useContext(ModalContext);
  if (!api) throw new Error('useModal 은 ModalProvider 안에서만 쓸 수 있습니다.');
  return api;
}

const EXIT_MS = 160;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
      timers.current.clear();
    },
    [],
  );

  const dismiss = useCallback((id: number, value: unknown) => {
    setStack((current) => current.map((e) => (e.id === id ? { ...e, closing: true } : e)));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setStack((current) => {
        const entry = current.find((e) => e.id === id);
        entry?.resolve(value);
        return current.filter((e) => e.id !== id);
      });
    }, EXIT_MS);
    timers.current.add(timer);
  }, []);

  const open = useCallback(
    <T,>(render: ModalRender<T>, options: ModalOptions = {}) =>
      new Promise<T | undefined>((resolve) => {
        const id = nextId.current++;
        setStack((current) => [
          ...current,
          {
            id,
            render: render as ModalRender<unknown>,
            options: {
              size: options.size ?? 'md',
              dismissible: options.dismissible ?? true,
              full: options.full ?? false,
            },
            resolve: resolve as (value: unknown) => void,
            closing: false,
          },
        ]);
      }),
    [],
  );

  const api = useMemo<ModalApi>(() => {
    const alert = (options: AlertOptions) =>
      open<void>(
        ({ close }) => (
          <>
            <ModalHead
              title={options.title}
              description={options.description}
              icon={options.icon ?? 'info'}
              tone={options.tone ?? 'brand'}
              onClose={() => close()}
            />
            {options.body && <ModalBody>{options.body}</ModalBody>}
            <ModalFoot>
              <button
                type="button"
                className="btn btn--primary"
                data-autofocus
                onClick={() => close()}
              >
                {options.confirmText ?? '확인'}
              </button>
            </ModalFoot>
          </>
        ),
        { size: options.size ?? 'sm' },
      ).then(() => undefined);

    const confirm = (options: ConfirmOptions) =>
      open<boolean>(
        ({ close }) => (
          <>
            <ModalHead
              title={options.title}
              description={options.description}
              icon={options.icon ?? (options.destructive ? 'alert' : 'help')}
              tone={options.tone ?? (options.destructive ? 'danger' : 'brand')}
              onClose={() => close(false)}
            />
            {options.body && <ModalBody>{options.body}</ModalBody>}
            <ModalFoot>
              <button type="button" className="btn" onClick={() => close(false)}>
                {options.cancelText ?? '취소'}
              </button>
              <button
                type="button"
                className={`btn ${options.destructive ? 'btn--danger-solid' : 'btn--primary'}`}
                data-autofocus
                onClick={() => close(true)}
              >
                {options.confirmText ?? '확인'}
              </button>
            </ModalFoot>
          </>
        ),
        { size: options.size ?? 'sm' },
      ).then((value) => value === true);

    const prompt = (options: PromptOptions) =>
      open<string | null>(({ close }) => <PromptForm options={options} close={close} />, {
        size: options.size ?? 'sm',
      }).then((value) => (typeof value === 'string' ? value : null));

    return {
      open,
      alert,
      confirm,
      prompt,
      closeAll: () => setStack((current) => current.map((e) => ({ ...e, closing: true }))),
    };
  }, [open]);

  // 모달이 하나라도 열려 있으면 뒤 배경 스크롤을 잠근다.
  useEffect(() => {
    const locked = stack.some((e) => !e.closing);
    document.body.dataset.locked = locked ? 'true' : 'false';
    return () => {
      document.body.dataset.locked = 'false';
    };
  }, [stack]);

  return (
    <ModalContext.Provider value={api}>
      {children}
      {stack.length > 0 &&
        createPortal(
          <div className="modal-root">
            {stack.map((entry, index) => (
              <ModalLayer
                key={entry.id}
                entry={entry}
                behind={index < stack.length - 1}
                onDismiss={() => dismiss(entry.id, undefined)}
                onClose={(value) => dismiss(entry.id, value)}
              />
            ))}
          </div>,
          document.body,
        )}
    </ModalContext.Provider>
  );
}

interface LayerProps {
  entry: Entry;
  behind: boolean;
  onDismiss: () => void;
  onClose: (value: unknown) => void;
}

function ModalLayer({ entry, behind, onDismiss, onClose }: LayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${entry.id}`;
  useFocusTrap(ref, !entry.closing && !behind);

  useEffect(() => {
    if (behind || entry.closing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && entry.options.dismissible) {
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [behind, entry.closing, entry.options.dismissible, onDismiss]);

  const control = useMemo<ModalControl<unknown>>(
    () => ({ close: (value) => onClose(value) }),
    [onClose],
  );

  return (
    <div
      className="modal-layer"
      data-closing={entry.closing ? 'true' : 'false'}
      data-behind={behind ? 'true' : 'false'}
    >
      <div
        className="modal-backdrop"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget && entry.options.dismissible) onDismiss();
        }}
      />
      <div
        ref={ref}
        className={`modal modal--${entry.options.size}${entry.options.full ? ' modal--full' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal__grip" aria-hidden="true" />
        <ModalIdContext.Provider value={titleId}>{entry.render(control)}</ModalIdContext.Provider>
      </div>
    </div>
  );
}

/** 헤더가 자기 id 를 알 수 있게 해 aria-labelledby 가 항상 맞물리게 한다. */
const ModalIdContext = createContext<string | undefined>(undefined);
export const useModalTitleId = () => useContext(ModalIdContext);

function PromptForm({
  options,
  close,
}: {
  options: PromptOptions;
  close: (value?: string | null) => void;
}) {
  const [value, setValue] = useState(options.initialValue ?? '');
  const [error, setError] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState(false);

  const submit = () => {
    const problem = options.validate?.(value);
    setTouched(true);
    setError(problem);
    if (problem) return;
    close(value);
  };

  const shown = touched ? error : undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ModalHead
        title={options.title}
        description={options.description}
        icon={options.icon ?? 'pencil'}
        tone={options.tone ?? 'brand'}
        onClose={() => close(null)}
      />
      <ModalBody>
        <label className="field">
          {options.label && <span className="field__label">{options.label}</span>}
          {options.multiline ? (
            <textarea
              className="input"
              data-autofocus
              value={value}
              maxLength={options.maxLength}
              placeholder={options.placeholder}
              aria-invalid={shown ? 'true' : undefined}
              onChange={(event) => {
                setValue(event.target.value);
                if (touched) setError(options.validate?.(event.target.value));
              }}
            />
          ) : (
            <input
              className="input"
              data-autofocus
              value={value}
              maxLength={options.maxLength}
              placeholder={options.placeholder}
              aria-invalid={shown ? 'true' : undefined}
              onChange={(event) => {
                setValue(event.target.value);
                if (touched) setError(options.validate?.(event.target.value));
              }}
            />
          )}
          {shown && <span className="field__error">{shown}</span>}
          {options.maxLength && !shown && (
            <span className="field__hint">
              {value.length} / {options.maxLength}
            </span>
          )}
        </label>
        {options.body}
      </ModalBody>
      <ModalFoot>
        <button type="button" className="btn" onClick={() => close(null)}>
          {options.cancelText ?? '취소'}
        </button>
        <button type="submit" className="btn btn--primary">
          {options.confirmText ?? '저장'}
        </button>
      </ModalFoot>
    </form>
  );
}
