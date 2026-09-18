'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MetricStrip } from '@/components/layout/MetricStrip';
import { Button } from '@/components/ui/Button';
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
import { TurnSummaryBar } from '@/features/shell/TurnSummaryBar';
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

  const Screen = SCREENS[screen];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <MetricStrip />

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-5 pb-24">
          <Screen />
        </main>
      </div>

      <TurnSummaryBar />
      <EventModal />
      <GameOverModal />

      {notice && (
        <div
          role="status"
          className="rise fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-md px-3.5 py-2 text-[12px] shadow-lg"
          style={{
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

export { Button };
