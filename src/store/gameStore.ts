'use client';

import { create } from 'zustand';
import type {
  BudgetCategory,
  CountryId,
  DiplomaticActionType,
  GameState,
  NationState,
  SaveSlot,
  TurnSummary,
} from '@/types';
import {
  advanceTurn,
  canAdvanceTurn,
  declareWar,
  performDiplomaticAction,
  resolvePendingEvent,
} from '@/simulation/engine';
import { applyPolicy } from '@/simulation/government/policy';
import { createGame } from '@/simulation/state/createGame';
import { clearAll, readSave, writeSave, type SaveMeta } from '@/lib/save/storage';
import { peekSave } from '@/lib/save/storage';

export type Screen =
  | 'overview'
  | 'economy'
  | 'budget'
  | 'tax'
  | 'population'
  | 'diplomacy'
  | 'military'
  | 'statistics'
  | 'news';

interface Notice {
  message: string;
  tone: 'info' | 'error';
}

interface GameStore {
  game: GameState | null;
  screen: Screen;
  namespace: string;
  lastSummary: TurnSummary | null;
  notice: Notice | null;
  busy: boolean;
  saveMeta: { manual: SaveMeta | null; auto: SaveMeta | null };

  startGame: (country: CountryId, seed?: string) => void;
  nextTurn: () => void;
  chooseEventOption: (choiceId: string) => void;

  setTax: (key: 'income' | 'corporate' | 'consumption', value: number) => void;
  setBudget: (category: BudgetCategory, value: number) => void;
  setPolicyRate: (value: number) => void;
  setCentralBankAuto: (auto: boolean) => void;

  runDiplomacy: (type: DiplomaticActionType, target: CountryId) => void;
  startWar: (target: CountryId) => void;

  setScreen: (screen: Screen) => void;
  setNamespace: (namespace: string) => void;
  saveGame: () => void;
  loadGame: (slot: SaveSlot) => void;
  resetGame: () => void;
  refreshSaveMeta: () => void;
  dismissNotice: () => void;
}

const AUTOSAVE_LABEL = '자동 저장';

function withPlayerPolicy(
  game: GameState,
  update: (nation: NationState) => NationState['policy'],
): GameState {
  const nation = game.nations[game.playerCountry];
  // 분기당 변화 한도는 '직전 분기에 반영된 정책' 기준으로 적용된다.
  const policy = applyPolicy(nation.lastAppliedPolicy, update(nation));

  return {
    ...game,
    nations: { ...game.nations, [game.playerCountry]: { ...nation, policy } },
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  screen: 'overview',
  namespace: 'local',
  lastSummary: null,
  notice: null,
  busy: false,
  saveMeta: { manual: null, auto: null },

  startGame: (country, seed) => {
    const game = createGame({ playerCountry: country, seed });
    set({ game, screen: 'overview', lastSummary: null, notice: null });
    writeSave(game, 'auto', get().namespace, AUTOSAVE_LABEL);
    get().refreshSaveMeta();
  },

  nextTurn: () => {
    const { game, namespace } = get();
    if (!game) return;
    if (!canAdvanceTurn(game)) {
      set({
        notice: {
          message: game.gameOver
            ? '게임이 종료되었습니다. 새 게임을 시작하세요.'
            : '발생한 이벤트에 대한 결정을 먼저 내려야 합니다.',
          tone: 'error',
        },
      });
      return;
    }

    set({ busy: true });
    const result = advanceTurn(game);
    writeSave(result.state, 'auto', namespace, AUTOSAVE_LABEL);
    set({ game: result.state, lastSummary: result.summary, busy: false });
    get().refreshSaveMeta();
  },

  chooseEventOption: (choiceId) => {
    const { game } = get();
    if (!game || !game.pendingEvent) return;
    set({ game: resolvePendingEvent(game, choiceId) });
  },

  setTax: (key, value) => {
    const { game } = get();
    if (!game) return;
    set({
      game: withPlayerPolicy(game, (nation) => ({
        ...nation.policy,
        tax: { ...nation.policy.tax, [key]: value },
      })),
    });
  },

  setBudget: (category, value) => {
    const { game } = get();
    if (!game) return;
    set({
      game: withPlayerPolicy(game, (nation) => ({
        ...nation.policy,
        budget: { ...nation.policy.budget, [category]: value },
      })),
    });
  },

  setPolicyRate: (value) => {
    const { game } = get();
    if (!game) return;
    set({
      game: withPlayerPolicy(game, (nation) => ({ ...nation.policy, policyRate: value })),
    });
  },

  setCentralBankAuto: (auto) => {
    const { game } = get();
    if (!game) return;
    set({
      game: withPlayerPolicy(game, (nation) => ({ ...nation.policy, centralBankAuto: auto })),
    });
  },

  runDiplomacy: (type, target) => {
    const { game } = get();
    if (!game) return;
    const outcome = performDiplomaticAction(game, {
      type,
      actor: game.playerCountry,
      target,
    });
    if (outcome.error) {
      set({ notice: { message: outcome.error, tone: 'error' } });
      return;
    }
    set({ game: outcome.state, notice: { message: '외교 행동을 실행했습니다.', tone: 'info' } });
  },

  startWar: (target) => {
    const { game } = get();
    if (!game) return;
    const outcome = declareWar(game, target);
    if (outcome.error) {
      set({ notice: { message: outcome.error, tone: 'error' } });
      return;
    }
    set({ game: outcome.state, notice: { message: '선전포고가 공표되었습니다.', tone: 'info' } });
  },

  setScreen: (screen) => set({ screen }),

  setNamespace: (namespace) => {
    set({ namespace });
    get().refreshSaveMeta();
  },

  saveGame: () => {
    const { game, namespace } = get();
    if (!game) return;
    const label = `${game.nations[game.playerCountry].name} · ${game.turn}분기`;
    const ok = writeSave(game, 'manual', namespace, label);
    set({
      notice: {
        message: ok ? '저장했습니다.' : '저장에 실패했습니다. 브라우저 저장 공간을 확인하세요.',
        tone: ok ? 'info' : 'error',
      },
    });
    get().refreshSaveMeta();
  },

  loadGame: (slot) => {
    const { namespace } = get();
    const result = readSave(slot, namespace);
    if (!result.ok) {
      set({ notice: { message: result.error, tone: 'error' } });
      return;
    }
    set({
      game: result.state,
      screen: 'overview',
      lastSummary: null,
      notice: { message: '저장된 게임을 불러왔습니다.', tone: 'info' },
    });
  },

  resetGame: () => {
    clearAll(get().namespace);
    set({ game: null, lastSummary: null, notice: null, saveMeta: { manual: null, auto: null } });
  },

  refreshSaveMeta: () => {
    const { namespace } = get();
    set({
      saveMeta: {
        manual: peekSave('manual', namespace),
        auto: peekSave('auto', namespace),
      },
    });
  },

  dismissNotice: () => set({ notice: null }),
}));

/** 자주 쓰는 파생 선택자. 컴포넌트가 필요한 조각만 구독하도록 분리해 둔다. */
export const selectPlayer = (store: GameStore): NationState | null =>
  store.game ? store.game.nations[store.game.playerCountry] : null;

export function usePlayerNation(): NationState | null {
  return useGameStore(selectPlayer);
}

export function useGame(): GameState | null {
  return useGameStore((store) => store.game);
}
