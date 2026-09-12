/**
 * 生存に関するバランス値（仕様書 §14 Phase 1）。
 *
 * Phase 2 で Genome（metabolism, bodySize, longevity など）から算出するようになる。
 * それまでは全個体共通の定数として扱い、係数を掛ける口だけ用意しておく。
 */

/** 個体が保持できるエネルギーの上限。 */
export const MAX_ENERGY = 100;

/** 初期エネルギー。上限より低くし、生成直後から採食の動機を持たせる。 */
export const INITIAL_ENERGY = 62;

/** 基礎代謝（1秒あたり）。何もしていなくても消費する。 */
export const BASAL_METABOLISM_PER_SECOND = 0.5;

/**
 * 移動コスト係数。移動速度に比例して消費する（仕様書 §6「高速化 → 移動時のエネルギー消費増」）。
 * 消費量 = 係数 × 速度。
 */
export const MOVEMENT_COST_PER_UNIT_DISTANCE = 0.22;

/** 休息時に基礎代謝へ掛ける倍率。1未満で消費が減る。 */
export const REST_METABOLISM_MULTIPLIER = 0.45;

/** 視界の半径（ワールド単位）。Phase 2 で visionRange から算出する。 */
export const VISION_RANGE = 12;

/**
 * 近傍探索グリッドのセルサイズ。
 * 想定される最大視界に合わせ、探索が3×3セルで完結するようにする。
 */
export const SPATIAL_CELL_SIZE = VISION_RANGE;

/** 最大移動速度（ワールド単位/秒）。Phase 2 で speed から算出する。 */
export const MAX_SPEED = 3.2;

/** 1秒あたりの最大旋回角（ラジアン）。急な方向転換を防ぐ。 */
export const MAX_TURN_RATE = Math.PI * 1.4;

/** 寿命（秒）。個体ごとにばらつきを持たせる。 */
export const LIFESPAN_MIN_SECONDS = 150;
export const LIFESPAN_MAX_SECONDS = 260;

/** 意思決定を行う間隔（秒）。個体ごとに位相をずらす（仕様書 §7）。 */
export const DECISION_INTERVAL_SECONDS = 0.25;

/** エネルギーがこの割合を下回ると空腹とみなす。 */
export const HUNGER_THRESHOLD_RATIO = 0.65;

/** エネルギーがこの割合を上回ると休息を選びやすくなる。 */
export const SATIATED_RATIO = 0.85;
