import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'caution' | 'accent';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--color-surface-muted)', fg: 'var(--color-ink-muted)' },
  positive: { bg: 'var(--color-positive-soft)', fg: 'var(--color-positive)' },
  negative: { bg: 'var(--color-negative-soft)', fg: 'var(--color-negative)' },
  caution: { bg: 'var(--color-caution-soft)', fg: 'var(--color-caution)' },
  accent: { bg: 'var(--color-accent-soft)', fg: 'var(--color-accent)' },
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const palette = TONES[tone];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {children}
    </span>
  );
}
