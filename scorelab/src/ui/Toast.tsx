/** 자체 토스트. 되돌리기가 필요한 동작(삭제 등)은 여기에 실행 취소 버튼을 단다. */
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
import { Icon, type IconName } from './Icon';

export type ToastTone = 'default' | 'ok' | 'warn' | 'bad';

export interface ToastOptions {
  tone?: ToastTone;
  icon?: IconName;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastOptions {
  id: number;
  message: string;
  closing: boolean;
}

export interface ToastApi {
  show(message: string, options?: ToastOptions): number;
  ok(message: string, options?: ToastOptions): number;
  error(message: string, options?: ToastOptions): number;
  dismiss(id: number): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast 는 ToastProvider 안에서만 쓸 수 있습니다.');
  return api;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  default: 'info',
  ok: 'check-circle',
  warn: 'alert',
  bad: 'alert',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    setItems((current) => current.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => setItems((current) => current.filter((t) => t.id !== id)), 150);
  }, []);

  const api = useMemo<ToastApi>(() => {
    const show = (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      const duration = options.duration ?? (options.action ? 6000 : 3200);
      setItems((current) => [...current.slice(-3), { id, message, closing: false, ...options }]);
      const timer = setTimeout(() => remove(id), duration);
      timers.current.set(id, timer);
      return id;
    };
    return {
      show,
      ok: (message, options) => show(message, { tone: 'ok', ...options }),
      error: (message, options) => show(message, { tone: 'bad', duration: 5000, ...options }),
      dismiss: remove,
    };
  }, [remove]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {items.length > 0 &&
        createPortal(
          <div className="toast-root" role="status" aria-live="polite">
            {items.map((toast) => (
              <div
                key={toast.id}
                className={`toast toast--${toast.tone ?? 'default'}`}
                data-closing={toast.closing ? 'true' : 'false'}
              >
                <span className="toast__icon">
                  <Icon name={toast.icon ?? TONE_ICON[toast.tone ?? 'default']} size={18} />
                </span>
                <span className="toast__text">{toast.message}</span>
                {toast.action && (
                  <button
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      toast.action?.onClick();
                      remove(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
