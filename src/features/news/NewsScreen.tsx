'use client';

import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import type { NewsSection, NewsTone } from '@/types';
import { TURNS_PER_YEAR } from '@/config/constants';
import { useGameStore } from '@/store/gameStore';

const SECTION_LABEL: Record<NewsSection, string> = {
  economy: '경제',
  society: '사회',
  politics: '정치',
  world: '국제',
  defense: '국방',
};

const TONE: Record<NewsTone, 'positive' | 'negative' | 'neutral'> = {
  good: 'positive',
  bad: 'negative',
  neutral: 'neutral',
};

export function NewsScreen() {
  const news = useGameStore((store) => store.game?.news ?? []);
  const eventHistory = useGameStore((store) => store.game?.eventHistory ?? []);
  const startYear = useGameStore((store) => store.game?.startYear ?? 0);

  const ordered = [...news].reverse();

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="뉴스" description="분기마다 지표 변화와 사건을 기사 형태로 정리합니다.">
        <ul className="divide-y">
          {ordered.map((item) => {
            const year = startYear + Math.floor(item.turn / TURNS_PER_YEAR);
            const quarter = (item.turn % TURNS_PER_YEAR) + 1;
            return (
              <li key={`${item.turn}-${item.id}`} className="py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <Badge tone={TONE[item.tone]}>{SECTION_LABEL[item.section]}</Badge>
                  <span className="tnum text-[10px] text-[var(--color-ink-faint)]">
                    {year}년 {quarter}분기
                  </span>
                </div>
                <h3 className="mt-1.5 text-[13px] font-semibold leading-snug">{item.headline}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                  {item.body}
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="이벤트 기록" description="발생한 사건과 내가 내린 결정입니다.">
        {eventHistory.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-faint)]">아직 기록된 사건이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {[...eventHistory].reverse().map((entry, index) => {
              const year = startYear + Math.floor(entry.turn / TURNS_PER_YEAR);
              const quarter = (entry.turn % TURNS_PER_YEAR) + 1;
              return (
                <li key={`${entry.eventId}-${entry.turn}-${index}`} className="py-2.5 first:pt-0">
                  <span className="tnum text-[10px] text-[var(--color-ink-faint)]">
                    {year}년 {quarter}분기
                  </span>
                  <h3 className="text-[12px] font-medium">{entry.title}</h3>
                  {entry.choiceLabel && (
                    <p className="mt-0.5 text-[11px] text-[var(--color-accent)]">
                      선택: {entry.choiceLabel}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
