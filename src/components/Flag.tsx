import type { ReactNode } from 'react';
import type { CountryId } from '@/types';

interface FlagProps {
  country: CountryId;
  size?: number;
  className?: string;
}

/** 삼괘의 막대 하나. `split` 이면 가운데가 끊긴 막대(음효)가 된다. */
function Bar({ y, split }: { y: number; split: boolean }) {
  const width = 4;
  const height = 0.75;
  if (!split) return <rect x={-width / 2} y={y} width={width} height={height} />;
  const half = (width - 0.7) / 2;
  return (
    <>
      <rect x={-width / 2} y={y} width={half} height={height} />
      <rect x={width / 2 - half} y={y} width={half} height={height} />
    </>
  );
}

/**
 * 4괘 중 하나. 막대 세 개를 중심선 방향으로 쌓고,
 * 태극 중심을 향하도록 ±56.31°(3:2 비율 대각선의 법선) 회전시킨다.
 */
function Trigram({
  x,
  y,
  angle,
  split,
}: {
  x: number;
  y: number;
  angle: number;
  split: boolean[];
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#0f0f0f">
      {split.map((isSplit, index) => (
        <Bar key={index} y={-1.6 + index * 1.2} split={isSplit} />
      ))}
    </g>
  );
}

/** 24×16 기준으로 단순화한 국기. 아이콘 크기에서 식별되는 수준까지만 그린다. */
const FLAGS: Record<CountryId, ReactNode> = {
  KOR: (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      {/* 태극 지름은 깃면 너비의 1/3, 기울기는 33.69°(3:2 대각선) */}
      <g transform="rotate(-33.69 15 10)">
        <path d="M10 10a5 5 0 0 1 10 0 2.5 2.5 0 0 0-5 0 2.5 2.5 0 0 1-5 0Z" fill="#cd2e3a" />
        <path d="M10 10a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 0 5 0 5 5 0 0 1-10 0Z" fill="#0047a0" />
      </g>
      <Trigram x={5.2} y={4.4} angle={-56.31} split={[false, false, false]} />
      <Trigram x={24.8} y={4.4} angle={56.31} split={[true, false, true]} />
      <Trigram x={5.2} y={15.6} angle={56.31} split={[false, true, false]} />
      <Trigram x={24.8} y={15.6} angle={-56.31} split={[true, true, true]} />
    </>
  ),
  USA: (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={(i * 20) / 6.5} width={30} height={20 / 13} fill="#b22234" />
      ))}
      <rect width={13} height={20 * (7 / 13)} fill="#3c3b6e" />
      <g fill="#ffffff">
        {[2.4, 5.2, 8, 10.8].map((x) =>
          [2, 5.4, 8.8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.72} />),
        )}
      </g>
    </>
  ),
  JPN: (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      <circle cx={15} cy={10} r={6} fill="#bc002d" />
    </>
  ),
  CHN: (
    <>
      <rect width={30} height={20} fill="#ee1c25" />
      <path d="m5.6 2.6 1.18 3.63-3.09-2.24h3.82L4.42 6.23Z" fill="#ffde00" />
      <circle cx={10.4} cy={2.2} r={0.78} fill="#ffde00" />
      <circle cx={12.4} cy={4.1} r={0.78} fill="#ffde00" />
      <circle cx={12.4} cy={6.8} r={0.78} fill="#ffde00" />
      <circle cx={10.4} cy={8.7} r={0.78} fill="#ffde00" />
    </>
  ),
  DEU: (
    <>
      <rect width={30} height={6.67} fill="#111111" />
      <rect y={6.67} width={30} height={6.67} fill="#dd0000" />
      <rect y={13.34} width={30} height={6.66} fill="#ffce00" />
    </>
  ),
  FRA: (
    <>
      <rect width={10} height={20} fill="#002395" />
      <rect x={10} width={10} height={20} fill="#ffffff" />
      <rect x={20} width={10} height={20} fill="#ed2939" />
    </>
  ),
  GBR: (
    <>
      <rect width={30} height={20} fill="#012169" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#ffffff" strokeWidth={4.2} />
      <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth={2.1} />
      <path d="M15 0v20M0 10h30" stroke="#ffffff" strokeWidth={6.4} />
      <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth={3.6} />
    </>
  ),
  IND: (
    <>
      <rect width={30} height={6.67} fill="#ff9933" />
      <rect y={6.67} width={30} height={6.67} fill="#ffffff" />
      <rect y={13.34} width={30} height={6.66} fill="#138808" />
      <circle cx={15} cy={10} r={2.7} fill="none" stroke="#000088" strokeWidth={0.62} />
      <circle cx={15} cy={10} r={0.62} fill="#000088" />
    </>
  ),
};

const NAMES: Record<CountryId, string> = {
  KOR: '대한민국',
  USA: '미국',
  JPN: '일본',
  CHN: '중국',
  DEU: '독일',
  FRA: '프랑스',
  GBR: '영국',
  IND: '인도',
};

export function Flag({ country, size = 22, className }: FlagProps) {
  return (
    <svg
      viewBox="0 0 30 20"
      width={size}
      height={(size / 30) * 20}
      className={`shrink-0 rounded-[2px] ${className ?? ''}`}
      style={{ boxShadow: '0 0 0 1px rgb(0 0 0 / 0.1) inset' }}
      role="img"
      aria-label={`${NAMES[country]} 국기`}
    >
      {FLAGS[country]}
    </svg>
  );
}
