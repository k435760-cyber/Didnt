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
}

export function Modal({ open, title, subtitle, children, onClose, width = 620 }: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rise max-h-[88vh] w-full overflow-y-auto rounded-xl border bg-[var(--color-surface)] shadow-xl"
        style={{ maxWidth: width, borderColor: 'var(--color-line)' }}
      >
        <header className="border-b px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{subtitle}</p>}
        </header>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
