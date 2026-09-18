'use client';

interface SparklineProps {
  values: readonly number[];
  width?: number;
  height?: number;
  tone?: 'accent' | 'positive' | 'negative' | 'neutral';
}

const TONE_COLOR: Record<NonNullable<SparklineProps['tone']>, string> = {
  accent: 'var(--color-accent)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  neutral: 'var(--color-ink-faint)',
};

/** 지표 타일 안에 들어가는 추세선. 축·격자 없이 방향만 보여준다. */
export function Sparkline({ values, width = 96, height = 24, tone = 'neutral' }: SparklineProps) {
  const points = values.filter(Number.isFinite);
  if (points.length < 2) return <div style={{ height }} />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={TONE_COLOR[tone]}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
