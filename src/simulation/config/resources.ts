/**
 * 資源に関するバランス値（仕様書 §4「資源」）。
 * Phase 1 では植物性餌・水場・岩のみ。小昆虫と死骸は Phase 3 で追加する。
 */

/** 初期配置する植物性餌の数。 */
export const INITIAL_FOOD_COUNT = 400;

/** 植物性餌1つが持つエネルギー量の範囲。 */
export const FOOD_ENERGY_MIN = 24;
export const FOOD_ENERGY_MAX = 42;

/** 蟻が1回の採食で吸収できるエネルギー量（1秒あたり）。 */
export const FOOD_INTAKE_PER_SECOND = 26;

/** 採食できる距離。これより近づくと Eat へ移行する。 */
export const FOOD_REACH = 0.9;

/**
 * 餌が尽きてから再生が始まるまでの待ち時間（秒）。
 *
 * 餌の総供給量（個数 × 容量 ÷ 再生時間）が100匹の総消費量をやや下回るよう調整してある。
 * 供給が上回ると蟻が餌の上に居座り探索が起きなくなり、大きく下回ると開始1分で全滅する。
 */
export const FOOD_REGROWTH_DELAY_SECONDS = 6;

/** 再生にかかる時間（秒）。この間はエネルギーが線形に回復する。 */
export const FOOD_REGROWTH_DURATION_SECONDS = 42;

/**
 * 水場の近くで再生が速くなる倍率と、その影響が及ぶ距離。
 * 仕様書 §4「周辺条件と時間で再生」の最小実装。
 */
export const FOOD_REGROWTH_WATER_BONUS = 2.2;
export const WATER_INFLUENCE_RADIUS = 16;

/** 初期配置する水場の数と半径の範囲。 */
export const INITIAL_WATER_COUNT = 3;
export const WATER_RADIUS_MIN = 5;
export const WATER_RADIUS_MAX = 9;

/** 初期配置する岩の数と半径の範囲。 */
export const INITIAL_ROCK_COUNT = 14;
export const ROCK_RADIUS_MIN = 1.2;
export const ROCK_RADIUS_MAX = 3.4;

/** 地形同士が重ならないよう配置を試行する回数の上限。 */
export const TERRAIN_PLACEMENT_ATTEMPTS = 40;
