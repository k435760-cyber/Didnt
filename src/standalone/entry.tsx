/**
 * 단일 파일(index.html) 번들용 진입점.
 *
 * Next.js 라우팅 없이 같은 컴포넌트 트리를 그대로 마운트한다.
 * 시뮬레이션 엔진·상태관리·UI 는 Next 앱과 100% 동일한 코드를 쓴다.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StartScreen } from '@/features/setup/StartScreen';
import { GameShell } from '@/features/shell/GameShell';
import { useGameStore } from '@/store/gameStore';

function App() {
  const hasGame = useGameStore((store) => store.game !== null);
  return hasGame ? <GameShell /> : <StartScreen />;
}

const container = document.getElementById('root');

if (container) {
  useGameStore.getState().refreshSaveMeta();
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
