/**
 * 世界生成に関するバランス値（仕様書 §4「フィールド」, §2）。
 * 数値をコード内へ分散させず、必ずここへ集約する（仕様書 §0-6）。
 */

/** フィールドの一辺の長さ（ワールド単位）。正方形。 */
export const FIELD_SIZE = 100;

/** フィールドの半径。中心を原点とするため ±HALF が境界になる。 */
export const FIELD_HALF = FIELD_SIZE / 2;

/** 蟻が境界へ近づける限界。体のめり込みを避けるための余白。 */
export const FIELD_MARGIN = 1;

/** 初期個体数（仕様書 §2）。 */
export const INITIAL_ANT_COUNT = 100;

/** 既定のシード。UIから変更できるようにするのはPhase 5の範囲。 */
export const DEFAULT_SEED = 'tiny-ants';

/**
 * Phase 0の暫定移動速度（ワールド単位/秒）。
 * Phase 2でGenome.speedから算出するようになるため、ここは一時的な値である。
 */
export const PHASE0_ANT_SPEED_MIN = 1.5;
export const PHASE0_ANT_SPEED_MAX = 4;

/** 蟻の表示上の基準サイズ（ワールド単位）。Phase 2でbodySizeを反映する。 */
export const ANT_BASE_LENGTH = 1.2;
