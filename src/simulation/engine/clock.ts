import {
  FIXED_TIMESTEP_SECONDS,
  MAX_FRAME_DELTA_SECONDS,
  MAX_STEPS_PER_FRAME,
} from '../config/time';

/**
 * 固定タイムステップ用のアキュムレータ（仕様書 §4, §12）。
 *
 * 描画フレームの可変デルタを受け取り、消化すべき固定ステップ数を返す。
 * 描画には依存しないため、単体テスト可能な純粋ロジックとして保つ。
 */
export interface FixedStepClock {
  /**
   * 実時間の経過を投入し、実行すべきステップ数を返す。
   *
   * @param frameDeltaSeconds 前フレームからの実時間（秒）
   * @param speedMultiplier 再生速度。0なら一時停止しステップは進まない
   */
  advance: (frameDeltaSeconds: number, speedMultiplier: number) => number;
  /** タブ復帰時など、溜まった時間を破棄する。経過分を一括計算しないため。 */
  reset: () => void;
  /** 未消化の端数時間（秒）。補間表示に使える。 */
  getPending: () => number;
}

export function createFixedStepClock(
  timestepSeconds: number = FIXED_TIMESTEP_SECONDS,
): FixedStepClock {
  let accumulator = 0;

  return {
    advance(frameDeltaSeconds: number, speedMultiplier: number): number {
      if (speedMultiplier <= 0 || frameDeltaSeconds <= 0) {
        return 0;
      }

      // タブ非アクティブからの復帰などで巨大なデルタが来た場合は切り詰める。
      const clampedDelta = Math.min(frameDeltaSeconds, MAX_FRAME_DELTA_SECONDS);
      accumulator += clampedDelta * speedMultiplier;

      let steps = 0;
      while (accumulator >= timestepSeconds && steps < MAX_STEPS_PER_FRAME) {
        accumulator -= timestepSeconds;
        steps += 1;
      }

      // 上限に達した場合、消化しきれない分は捨てる。
      // 残すと次フレーム以降へ負債が繰り越され、復帰できなくなるため。
      if (steps >= MAX_STEPS_PER_FRAME) {
        accumulator = 0;
      }

      return steps;
    },

    reset(): void {
      accumulator = 0;
    },

    getPending(): number {
      return accumulator;
    },
  };
}
