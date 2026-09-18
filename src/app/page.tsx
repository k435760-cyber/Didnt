'use client';

import { useEffect } from 'react';
import { StartScreen } from '@/features/setup/StartScreen';
import { GameShell } from '@/features/shell/GameShell';
import { useGameStore } from '@/store/gameStore';

export default function Page() {
  const hasGame = useGameStore((store) => store.game !== null);
  const refreshSaveMeta = useGameStore((store) => store.refreshSaveMeta);

  // localStorage 는 클라이언트에서만 접근할 수 있으므로 마운트 후에 저장 슬롯을 읽는다.
  useEffect(() => {
    refreshSaveMeta();
  }, [refreshSaveMeta]);

  return hasGame ? <GameShell /> : <StartScreen />;
}
