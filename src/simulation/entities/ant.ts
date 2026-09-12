import type { AntBehaviorState } from '../behaviors/types';
import type { AntId, LineageId, Vec3 } from '../types';

/**
 * Phase 1時点の蟻。
 *
 * 仕様書 §5 の `AntEntity` の部分集合。Genome・colonyId・health は
 * Phase 2以降で追加する。描画・UI専用の値はここへ持ち込まない（仕様書 §12）。
 */
export interface Ant {
  id: AntId;
  lineageId: LineageId;
  generation: number;
  position: Vec3;
  velocity: Vec3;
  /** 描画の向き算出に使う進行方位（ラジアン）。 */
  heading: number;

  /** 生存時間（秒）。 */
  age: number;
  /** これを超えると寿命で死亡する（秒）。 */
  lifespan: number;
  /** 現在のエネルギー。0で餓死する。 */
  energy: number;

  state: AntBehaviorState;
  /** 追跡中の餌のID。視界から外れたら解除する。 */
  // exactOptionalPropertyTypes が有効なため、解除時に undefined を代入できるよう明示する
  targetFoodId?: string | undefined;
  /**
   * 次の意思決定までの残り時間（秒）。
   * 個体ごとに初期値をずらし、判断を同一ステップへ集中させない（仕様書 §7）。
   */
  decisionCooldown: number;
  /** Explore中に向かう方位（ラジアン）。 */
  wanderHeading: number;
}

/** 死因。イベントログと統計で使う。 */
export type DeathCause = 'starvation' | 'oldAge';

export interface DeathRecord {
  antId: AntId;
  cause: DeathCause;
  ageSeconds: number;
}
