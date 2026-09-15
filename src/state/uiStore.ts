import { create } from 'zustand';
import type { SpeedMultiplier } from '../simulation/config/time';

/**
 * UI状態（仕様書 §12 Application State）。
 *
 * シミュレーションの状態はここへ持ち込まない。保持するのは
 * 「プレイヤーが何を選び、何を見ているか」だけ。
 */
interface UiState {
  /** 再生速度。0は一時停止（仕様書 §2）。 */
  speed: SpeedMultiplier;
  /** 選択中の個体ID。未選択なら undefined。 */
  selectedAntId: string | undefined;

  setSpeed: (speed: SpeedMultiplier) => void;
  togglePause: () => void;
  selectAnt: (antId: string | undefined) => void;
}

/** 一時停止から復帰したときに戻る速度。 */
const RESUME_SPEED: SpeedMultiplier = 1;

export const useUiStore = create<UiState>((set) => ({
  speed: 1,
  selectedAntId: undefined,

  setSpeed: (speed) => set({ speed }),

  togglePause: () => set((state) => ({ speed: state.speed === 0 ? RESUME_SPEED : 0 })),

  selectAnt: (antId) => set({ selectedAntId: antId }),
}));
