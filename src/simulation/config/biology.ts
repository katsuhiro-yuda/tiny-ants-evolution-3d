import { VISION_MAX } from './genetics';

/**
 * 全個体に共通する生存のバランス値。
 *
 * 個体ごとに変わる値（速度・視界・寿命・代謝・蓄積量）は Genome から算出するため、
 * ここには残さない。係数は `config/genetics.ts`、式は `genetics/traits.ts` にある。
 */

/** 初期エネルギー（各個体の上限に対する割合）。生成直後から採食の動機を持たせる。 */
export const INITIAL_ENERGY_RATIO = 0.62;

/** 休息時に基礎代謝へ掛ける倍率。1未満で消費が減る。 */
export const REST_METABOLISM_MULTIPLIER = 0.45;

/**
 * 近傍探索グリッドのセルサイズ。
 * 想定される最大視界に合わせ、探索が3×3セルで完結するようにする。
 */
export const SPATIAL_CELL_SIZE = VISION_MAX;

/** 旋回速度の基準値（ラジアン/秒）。bodySize で低下する。 */
export const MAX_TURN_RATE_BASE = Math.PI * 1.4;

/** 意思決定を行う間隔（秒）。個体ごとに位相をずらす（仕様書 §7）。 */
export const DECISION_INTERVAL_SECONDS = 0.25;

/** エネルギーがこの割合を下回ると空腹とみなす。 */
export const HUNGER_THRESHOLD_RATIO = 0.65;

/** エネルギーがこの割合を上回ると休息を選びやすくなる。 */
export const SATIATED_RATIO = 0.85;
