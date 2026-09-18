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
  /** 모바일 2열 그리드에서 쓰는 축약형. 보조 설명과 스파크라인을 감춘다. */
  dense?: boolean;
}

function deltaColor(trend: Trend, invert: boolean): string {
  if (trend === 'flat') return 'var(--color-ink-faint)';
  const good = invert ? trend === 'down' : trend === 'up';
  return good ? 'var(--color-positive)' : 'var(--color-negative)';
}

const ARROW: Record<Trend, string> = { up: '▲', down: '▼', flat: '–' };

export function Stat({
  label,
  value,
  sub,
  delta,
  invert = false,
  chart,
  dense = false,
}: StatProps) {
  return (
    <div
      className={`flex min-w-0 flex-col ${dense ? 'gap-0.5 px-3 py-2.5' : 'gap-1 px-3.5 py-2.5 md:gap-1.5 md:px-4 md:py-3'}`}
    >
      <span className="truncate text-[11px] font-medium tracking-wide text-[var(--color-ink-muted)] md:text-[11px]">
        {label}
      </span>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={`tnum font-semibold tracking-tight ${dense ? 'text-[19px]' : 'text-[20px] md:text-xl'}`}
        >
          {value}
        </span>
        {delta && (
          <span
            className="tnum text-[11px] font-medium"
            style={{ color: deltaColor(delta.trend, invert) }}
          >
            {ARROW[delta.trend]} {delta.value}
          </span>
        )}
      </div>
      {sub && (
        <span className="truncate text-[11px] text-[var(--color-ink-faint)] md:text-[11px]">
          {sub}
        </span>
      )}
      {/* 스파크라인은 좁은 화면에서 타일 높이만 키우므로 sm 이상에서만 보여준다. */}
      {chart && <div className={dense ? 'hidden' : 'hidden sm:block'}>{chart}</div>}
    </div>
  );
}
