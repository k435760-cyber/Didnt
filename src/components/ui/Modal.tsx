'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose?: () => void;
  width?: number;
  /** command 는 헤더를 짙게 처리해 '국가적 결정'이라는 무게를 준다. */
  tone?: 'default' | 'command';
}

/**
 * 데스크톱에서는 가운데 정렬 다이얼로그, 모바일에서는 바텀 시트로 동작한다.
 * 모바일 높이는 safe-area 를 뺀 값으로 제한해 시트가 화면 밖으로 나가지 않게 한다.
 */
export function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  width = 620,
  tone = 'default',
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border bg-[var(--color-surface)] shadow-xl sm:max-h-[88vh] sm:rounded-xl"
        style={{
          maxWidth: width,
          borderColor: 'var(--color-line)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <header
          className="shrink-0 border-b px-4 py-3.5 sm:px-6 sm:py-4"
          style={
            tone === 'command'
              ? {
                  backgroundColor: 'var(--color-command)',
                  color: 'var(--color-command-ink)',
                  borderColor: 'var(--color-command-line)',
                }
              : undefined
          }
        >
          <div
            className="mx-auto mb-2.5 h-1 w-9 rounded-full sm:hidden"
            style={{
              backgroundColor:
                tone === 'command' ? 'var(--color-command-line)' : 'var(--color-line-strong)',
            }}
          />
          {subtitle && (
            <p
              className="text-[11px] tracking-wide"
              style={{
                color: tone === 'command' ? 'var(--color-command-muted)' : 'var(--color-ink-faint)',
              }}
            >
              {subtitle}
            </p>
          )}
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight md:text-base">{title}</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
