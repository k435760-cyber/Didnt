import type { GameState } from './game';

export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: string;
  label: string;
  state: GameState;
}

export type SaveSlot = 'manual' | 'auto';
