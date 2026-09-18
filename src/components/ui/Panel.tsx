import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 모바일에서 설명을 숨긴다. 좁은 화면에서 밀도를 확보해야 하는 패널에 쓴다. */
  hideDescriptionOnMobile?: boolean;
  /** 본문 좌우 여백을 없앤다. 표·리스트가 카드 모서리까지 닿아야 할 때 쓴다. */
  flushBody?: boolean;
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  hideDescriptionOnMobile = false,
  flushBody = false,
}: PanelProps) {
  return (
    <section
      className={`min-w-0 rounded-lg border bg-[var(--color-surface)] ${className ?? ''}`}
      style={{ borderColor: 'var(--color-line)' }}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b px-3.5 py-3 md:gap-4 md:px-5 md:py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[14px] font-semibold tracking-tight md:text-sm">{title}</h2>
            )}
            {description && (
              <p
                className={`mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)] md:text-xs ${
                  hideDescriptionOnMobile ? 'hidden md:block' : ''
                }`}
              >
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={flushBody ? 'py-3 md:py-4' : 'px-3.5 py-3 md:px-5 md:py-4'}>{children}</div>
    </section>
  );
}
