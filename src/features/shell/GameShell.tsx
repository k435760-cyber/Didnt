'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { OverviewScreen } from '@/features/overview/OverviewScreen';
import { EconomyScreen } from '@/features/economy/EconomyScreen';
import { BudgetScreen } from '@/features/budget/BudgetScreen';
import { TaxScreen } from '@/features/tax/TaxScreen';
import { PopulationScreen } from '@/features/population/PopulationScreen';
import { DiplomacyScreen } from '@/features/diplomacy/DiplomacyScreen';
import { MilitaryScreen } from '@/features/military/MilitaryScreen';
import { StatisticsScreen } from '@/features/statistics/StatisticsScreen';
import { NewsScreen } from '@/features/news/NewsScreen';
import { EventModal, GameOverModal } from '@/features/events/EventModal';
import { TurnBar } from '@/features/shell/TurnBar';
import { QuarterResult } from '@/features/shell/QuarterResult';
import { useGameStore, type Screen } from '@/store/gameStore';

const SCREENS: Record<Screen, () => React.ReactElement | null> = {
  overview: OverviewScreen,
  economy: EconomyScreen,
  budget: BudgetScreen,
  tax: TaxScreen,
  population: PopulationScreen,
  diplomacy: DiplomacyScreen,
  military: MilitaryScreen,
  statistics: StatisticsScreen,
  news: NewsScreen,
};

export function GameShell() {
  const screen = useGameStore((store) => store.screen);
  const notice = useGameStore((store) => store.notice);
  const dismissNotice = useGameStore((store) => store.dismissNotice);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(dismissNotice, 3200);
    return () => window.clearTimeout(timer);
  }, [notice, dismissNotice]);

  // 화면을 바꾸면 이전 화면의 스크롤 위치가 남지 않도록 맨 위로 되돌린다.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const Screen = SCREENS[screen];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar />
      <MetricStrip />

      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="app-main min-w-0 flex-1 px-3.5 py-3.5 md:px-5 md:py-5">
          <Screen />
        </main>
      </div>

      <TurnBar />
      <BottomNav />
      <QuarterResult />
      <EventModal />
      <GameOverModal />

      {notice && (
        <div
          role="status"
          className="rise fixed left-1/2 z-[45] max-w-[min(88%,420px)] -translate-x-1/2 rounded-md px-3.5 py-2 text-center text-[12px] shadow-lg"
          style={{
            bottom:
              'calc(var(--turn-bar-height) + var(--bottom-nav-height) + var(--safe-bottom) + 12px)',
            backgroundColor: notice.tone === 'error' ? 'var(--color-negative)' : 'var(--color-ink)',
            color: 'var(--color-surface)',
          }}
        >
          {notice.message}
        </div>
      )}
    </div>
  );
}
