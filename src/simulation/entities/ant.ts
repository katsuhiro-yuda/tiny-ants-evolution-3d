import { DECISION_INTERVAL_SECONDS } from '../config/biology';
import { LIFESPAN_JITTER } from '../config/genetics';
import { computeLifespan, createDerivedTraits, type DerivedTraits } from '../genetics/traits';
import type { AntBehaviorState } from '../behaviors/types';
import type { Genome } from '../genetics/genome';
import type { AntId, LineageId, Random, Vec3 } from '../types';

/**
 * Phase 2時点の蟻。
 *
 * 仕様書 §5 の `AntEntity` の部分集合。colonyId は Phase 4、health は Phase 3（戦闘）で
 * 追加する。描画・UI専用の値はここへ持ち込まない（仕様書 §12）。
 */
export interface Ant {
  id: AntId;
  /** 親の個体ID。初期個体は持たない。 */
  parentId?: AntId | undefined;
  lineageId: LineageId;
  generation: number;

  genome: Genome;
  /** Genome から算出した能力値。生涯変わらないため生成時に一度だけ求める。 */
  traits: DerivedTraits;

  position: Vec3;
  velocity: Vec3;
  /** 描画の向き算出に使う進行方位（ラジアン）。 */
  heading: number;

  /** 生存時間（秒）。 */
  age: number;
  /** これを超えると寿命で死亡する（秒）。 */
  lifespan: number;
  /** 現在のエネルギー。0で餓死する。上限は traits.energyCapacity。 */
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
  /** 次に繁殖できるまでの残り時間（秒）。 */
  reproductionCooldown: number;
}

/** 死因。イベントログと統計で使う。 */
export type DeathCause = 'starvation' | 'oldAge';

export interface DeathRecord {
  antId: AntId;
  cause: DeathCause;
  ageSeconds: number;
}

/** 出生の記録。統計とイベントログが参照する。 */
export interface BirthRecord {
  antId: AntId;
  parentId: AntId;
  generation: number;
}

/** `createAnt` の入力。位置と方位は呼び出し側が決める。 */
export interface CreateAntParams {
  id: AntId;
  parentId?: AntId | undefined;
  lineageId: LineageId;
  generation: number;
  genome: Genome;
  x: number;
  z: number;
  heading: number;
  /** 初期エネルギー。初期個体は上限からの割合、子は親の持参分。 */
  energy: number;
  random: Random;
}

/**
 * 蟻を1体作る。初期個体の生成と繁殖で共通に使う。
 *
 * 寿命と意思決定の位相には個体差を与える。同じ形質の個体が同時に死んだり、
 * 同一ステップへ判断が集中したりするのを避けるため（仕様書 §7）。
 */
export function createAnt(params: CreateAntParams): Ant {
  const { random } = params;
  const traits = createDerivedTraits(params.genome);
  const lifespan =
    computeLifespan(params.genome) * (1 + random.range(-LIFESPAN_JITTER, LIFESPAN_JITTER));

  return {
    id: params.id,
    parentId: params.parentId,
    lineageId: params.lineageId,
    generation: params.generation,
    genome: params.genome,
    traits,
    position: { x: params.x, y: 0, z: params.z },
    velocity: { x: 0, y: 0, z: 0 },
    heading: params.heading,
    age: 0,
    lifespan,
    energy: Math.min(params.energy, traits.energyCapacity),
    state: 'Explore',
    decisionCooldown: random.range(0, DECISION_INTERVAL_SECONDS),
    wanderHeading: params.heading,
    // 生まれた直後は繁殖できない。成熟年齢の判定とは別に、初期個体の一斉繁殖も防ぐ
    reproductionCooldown: traits.reproductionCooldown,
  };
}
