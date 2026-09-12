/**
 * シミュレーション層の共通型。
 * 描画やUI専用の値をここへ持ち込まないこと（仕様書 §5, §12）。
 */

/** 3次元ベクトル。ワールド単位。 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type AntId = string;
export type ColonyId = string;
export type LineageId = string;

/**
 * 注入可能な乱数生成器。
 * シミュレーションは必ずこのインターフェース経由で乱数を取得する（仕様書 §12）。
 */
export interface Random {
  /** 0以上1未満の一様乱数。 */
  next: () => number;
  /** min以上max未満の一様乱数。 */
  range: (min: number, max: number) => number;
  /** min以上max以下の整数。 */
  int: (min: number, max: number) => number;
  /** 生成器の現在状態。同じ状態から再開すると同じ列が続く。 */
  getState: () => number;
}
