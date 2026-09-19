import type { ReactNode } from 'react';

type PanelVariant = 'default' | 'command' | 'plain';

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
  /**
   * default : 일반 카드
   * command : 국가 상태처럼 가장 중요한 블록. 짙은 표면으로 한 단계 올린다.
   * plain   : 카드 테두리 없이 제목과 구분선만. 부차적인 수치를 담을 때 쓴다.
   */
  variant?: PanelVariant;
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  hideDescriptionOnMobile = false,
  flushBody = false,
  variant = 'default',
}: PanelProps) {
  if (variant === 'plain') {
    return (
      <section className={`min-w-0 ${className ?? ''}`}>
        {(title || actions) && (
          <header className="mb-2.5 flex items-baseline justify-between gap-3 border-b pb-2">
            <div className="min-w-0">
              {title && (
                <h2 className="rule-before text-[13px] font-semibold tracking-tight text-[var(--color-ink-muted)]">
                  {title}
                </h2>
              )}
              {description && (
                <p
                  className={`mt-1 text-[12px] leading-relaxed text-[var(--color-ink-faint)] ${
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
        {children}
      </section>
    );
  }

  const command = variant === 'command';

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border ${className ?? ''}`}
      style={{
        borderColor: command ? 'var(--color-command-line)' : 'var(--color-line)',
        backgroundColor: command ? 'var(--color-command)' : 'var(--color-surface)',
        color: command ? 'var(--color-command-ink)' : undefined,
      }}
    >
      {(title || actions) && (
        <header
          className="flex items-start justify-between gap-3 border-b px-3.5 py-3 md:gap-4 md:px-5 md:py-4"
          style={{ borderColor: command ? 'var(--color-command-line)' : 'var(--color-line)' }}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-[14px] font-semibold tracking-tight md:text-sm">{title}</h2>
            )}
            {description && (
              <p
                className={`mt-1 text-[12px] leading-relaxed md:text-xs ${
                  hideDescriptionOnMobile ? 'hidden md:block' : ''
                }`}
                style={{
                  color: command ? 'var(--color-command-muted)' : 'var(--color-ink-muted)',
                }}
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
