import type { ReactNode } from 'react';

export type Trend = 'up' | 'down' | 'flat';

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: string; trend: Trend };
  /** 값이 좋을수록 올라가는 지표인지. 색상 방향을 뒤집는다. */
  invert?: boolean;
  chart?: ReactNode;
}

function deltaColor(trend: Trend, invert: boolean): string {
  if (trend === 'flat') return 'var(--color-ink-faint)';
  const good = invert ? trend === 'down' : trend === 'up';
  return good ? 'var(--color-positive)' : 'var(--color-negative)';
}

const ARROW: Record<Trend, string> = { up: '▲', down: '▼', flat: '–' };

export function Stat({ label, value, sub, delta, invert = false, chart }: StatProps) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <span className="text-[11px] font-medium tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="tnum text-xl font-semibold tracking-tight">{value}</span>
        {delta && (
          <span
            className="tnum text-[11px] font-medium"
            style={{ color: deltaColor(delta.trend, invert) }}
          >
            {ARROW[delta.trend]} {delta.value}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-[var(--color-ink-faint)]">{sub}</span>}
      {chart}
    </div>
  );
}
