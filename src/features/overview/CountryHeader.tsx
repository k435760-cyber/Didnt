'use client';

import { Flag } from '@/components/Flag';
import { TURNS_PER_YEAR } from '@/config/constants';
import { TONE_COLOR, assessApproval } from '@/lib/assessment';
import { formatTenure } from '@/lib/format';
import type { GameState } from '@/types';

/**
 * 국가 상태 헤더.
 *
 * 이 화면에서 가장 먼저 읽혀야 하는 것은 '어느 나라의, 언제이고, 지금 지지율은 얼마인가'다.
 * 짙은 표면으로 한 단계 올려 나머지 카드와 위계를 만든다.
 */
export function CountryHeader({ state }: { state: GameState }) {
  const nation = state.nations[state.playerCountry];
  const year = state.startYear + Math.floor(state.turn / TURNS_PER_YEAR);
  const quarter = (state.turn % TURNS_PER_YEAR) + 1;

  const approval = assessApproval(nation.politics.approval);

  return (
    <section
      className="min-w-0 overflow-hidden rounded-lg border"
      style={{
        backgroundColor: 'var(--color-command)',
        borderColor: 'var(--color-command-line)',
        color: 'var(--color-command-ink)',
      }}
    >
      <div className="flex items-center gap-3.5 px-4 py-3.5 md:px-5 md:py-4">
        <Flag country={state.playerCountry} size={40} />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-semibold tracking-tight md:text-[20px]">
            {nation.name}
          </h1>
          <p
            className="tnum mt-0.5 text-[12px] leading-snug"
            style={{ color: 'var(--color-command-muted)' }}
          >
            {year}년 · {quarter}분기 · {formatTenure(nation.politics.quartersInOffice)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px]" style={{ color: 'var(--color-command-muted)' }}>
            지지율
          </p>
          <p className="tnum text-[22px] font-semibold leading-tight">
            {Math.round(nation.politics.approval)}%
          </p>
          <p className="text-[11px] font-medium" style={{ color: TONE_COLOR[approval.tone] }}>
            {approval.label}
          </p>
        </div>
      </div>
    </section>
  );
}
