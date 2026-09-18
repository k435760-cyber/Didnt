'use client';

import { useGameStore, type Screen } from '@/store/gameStore';

const ITEMS: { key: Screen; label: string }[] = [
  { key: 'overview', label: '국가 개요' },
  { key: 'economy', label: '경제' },
  { key: 'budget', label: '예산' },
  { key: 'tax', label: '세금' },
  { key: 'population', label: '인구' },
  { key: 'diplomacy', label: '외교' },
  { key: 'military', label: '군사' },
  { key: 'statistics', label: '통계' },
  { key: 'news', label: '뉴스' },
];

export function Sidebar() {
  const screen = useGameStore((store) => store.screen);
  const setScreen = useGameStore((store) => store.setScreen);
  const pendingEvent = useGameStore((store) => store.game?.pendingEvent?.eventId ?? null);
  const wars = useGameStore((store) => store.game?.wars.length ?? 0);

  return (
    <nav
      aria-label="주 메뉴"
      className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 md:w-48 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
    >
      {ITEMS.map((item) => {
        const active = screen === item.key;
        const badge = item.key === 'military' && wars > 0 ? String(wars) : null;
        const alert = item.key === 'news' && pendingEvent !== null;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setScreen(item.key)}
            aria-current={active ? 'page' : undefined}
            className="flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors md:w-full"
            style={{
              backgroundColor: active ? 'var(--color-accent-soft)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-ink-muted)',
              fontWeight: active ? 600 : 400,
            }}
          >
            {item.label}
            {badge && (
              <span
                className="tnum rounded px-1 text-[10px] font-semibold"
                style={{
                  backgroundColor: 'var(--color-negative-soft)',
                  color: 'var(--color-negative)',
                }}
              >
                {badge}
              </span>
            )}
            {alert && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'var(--color-negative)' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
