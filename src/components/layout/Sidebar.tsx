'use client';

import { useGameStore } from '@/store/gameStore';
import { NAV_ITEMS } from './navItems';

/**
 * 데스크톱/태블릿(md 이상) 전용 좌측 내비게이션.
 * 모바일에서는 BottomNav 가 이 역할을 대신한다.
 */
export function Sidebar() {
  const screen = useGameStore((store) => store.screen);
  const setScreen = useGameStore((store) => store.setScreen);
  const pendingEvent = useGameStore((store) => store.game?.pendingEvent?.eventId ?? null);
  const wars = useGameStore((store) => store.game?.wars.length ?? 0);

  return (
    <nav
      aria-label="주 메뉴"
      className="hidden shrink-0 flex-col gap-1 border-r px-3 py-4 md:flex md:w-48"
    >
      {NAV_ITEMS.map((item) => {
        const active = screen === item.key;
        const badge = item.key === 'military' && wars > 0 ? String(wars) : null;
        const alert = item.key === 'news' && pendingEvent !== null;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setScreen(item.key)}
            aria-current={active ? 'page' : undefined}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors"
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
