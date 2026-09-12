/**
 * 時間に関するバランス値（仕様書 §4「時間」）。
 * 描画フレームレートから独立した固定タイムステップで計算する。
 */

/** 1シミュレーションステップの長さ（秒）。60Hz相当。 */
export const FIXED_TIMESTEP_SECONDS = 1 / 60;

/**
 * 1描画フレームで消化するステップ数の上限。
 * 描画が遅れても計算が雪だるま式に増えないようにする（spiral of death対策）。
 */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * 1描画フレームとして受け入れる実時間の上限（秒）。
 * これを超える間隔はタブ復帰などとみなし、経過時間を一括計算しない（仕様書 §4）。
 */
export const MAX_FRAME_DELTA_SECONDS = 0.25;

/** 再生速度の選択肢（仕様書 §2, §10）。0は一時停止。 */
export const SPEED_OPTIONS = [0, 1, 2, 4] as const;

export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];
