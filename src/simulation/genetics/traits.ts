import {
  ARMOR_METABOLISM_COST,
  ARMOR_MOVEMENT_COST,
  ARMOR_SPEED_PENALTY,
  BASAL_METABOLISM_BASE,
  BODY_SIZE_CAPACITY_BONUS,
  BODY_SIZE_METABOLISM_COST,
  BODY_SIZE_MOVEMENT_COST,
  BODY_SIZE_TURN_PENALTY,
  CROSS_DIGESTION_PENALTY,
  DIGESTION_MIN_EFFICIENCY,
  ENERGY_CAPACITY_BASE,
  FERTILITY_OFFSPRING_PENALTY,
  LIFESPAN_MAX,
  LIFESPAN_MIN,
  LONGEVITY_MATURITY_COST,
  MATURITY_AGE_BASE,
  METABOLISM_EFFICIENCY,
  METABOLISM_SPEED_PENALTY,
  MOVEMENT_COST_BASE,
  MOVEMENT_COST_SPEED_EXPONENT,
  OFFSPRING_ENERGY_SHARE,
  REPRODUCTION_COOLDOWN_MAX,
  REPRODUCTION_COOLDOWN_MIN,
  REPRODUCTION_ENERGY_RATIO,
  REPRODUCTION_PARENT_REMAINDER_RATIO,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_MOVEMENT_COST,
  VISION_MAX,
  VISION_METABOLISM_COST,
  VISION_MIN,
} from '../config/genetics';
import { MAX_TURN_RATE_BASE } from '../config/biology';
import type { Genome } from './genome';

/**
 * 形質から能力値を求める純粋関数（仕様書 §6「トレードオフ」）。
 *
 * すべての能力向上に、別の能力の低下かエネルギー消費の増加を対応させる。
 * 係数は `config/genetics.ts` に集約し、ここには式だけを置く。
 *
 * 1個体あたり毎ステップ呼ばれるため、オブジェクトを確保せず数値を返す。
 */

/** 0〜1の形質値を min〜max へ線形写像する。 */
function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

/**
 * 最大移動速度。
 * 装甲と代謝効率が上がるほど遅くなる（仕様書 §6「重装甲化 → 速度低下」、§5「瞬発性能との両立コスト」）。
 */
export function computeMaxSpeed(genome: Genome): number {
  const base = lerp(SPEED_MIN, SPEED_MAX, genome.speed);
  const penalty =
    1 - ARMOR_SPEED_PENALTY * genome.armor - METABOLISM_SPEED_PENALTY * genome.metabolism;

  return base * penalty;
}

/** 旋回速度。大型ほど鈍い（仕様書 §6「大型化 → 旋回低下」）。 */
export function computeTurnRate(genome: Genome): number {
  return MAX_TURN_RATE_BASE * (1 - BODY_SIZE_TURN_PENALTY * genome.bodySize);
}

/** 視界半径。 */
export function computeVisionRange(genome: Genome): number {
  return lerp(VISION_MIN, VISION_MAX, genome.visionRange);
}

/** エネルギーの上限。大型ほど多く蓄えられる（仕様書 §5「bodySize: 蓄積量」）。 */
export function computeEnergyCapacity(genome: Genome): number {
  return ENERGY_CAPACITY_BASE * (1 + BODY_SIZE_CAPACITY_BONUS * genome.bodySize);
}

/**
 * 基礎代謝（1秒あたり）。
 * 体格・装甲・視野がコストを押し上げ、代謝効率が押し下げる
 * （仕様書 §6「大型化・重装甲化 → 基礎代謝増」「視野拡大 → 感覚のエネルギー消費増」）。
 */
export function computeBasalMetabolism(genome: Genome): number {
  const load =
    1 +
    BODY_SIZE_METABOLISM_COST * genome.bodySize +
    ARMOR_METABOLISM_COST * genome.armor +
    VISION_METABOLISM_COST * genome.visionRange;

  return BASAL_METABOLISM_BASE * load * (1 - METABOLISM_EFFICIENCY * genome.metabolism);
}

/**
 * 移動コスト係数（単位距離あたり）。
 *
 * 速い個体は同じ時間により長い距離を進むため距離比例だけでも消費は増えるが、
 * それに加えて1歩あたりの単価も上げる（仕様書 §6「高速化 → 移動時のエネルギー消費増」）。
 * 単価を指数で効かせることで、速度を上げるほど加速度的に高くつく。
 */
export function computeMovementCost(genome: Genome): number {
  const speedLoad = 1 + SPEED_MOVEMENT_COST * genome.speed ** MOVEMENT_COST_SPEED_EXPONENT;
  const massLoad =
    1 + BODY_SIZE_MOVEMENT_COST * genome.bodySize + ARMOR_MOVEMENT_COST * genome.armor;

  return MOVEMENT_COST_BASE * speedLoad * massLoad;
}

/** 寿命（秒）。 */
export function computeLifespan(genome: Genome): number {
  return lerp(LIFESPAN_MIN, LIFESPAN_MAX, genome.longevity);
}

/** 繁殖可能になる年齢（秒）。長寿ほど遅い（仕様書 §6「長寿命 → 成熟までの時間増」）。 */
export function computeMaturityAge(genome: Genome): number {
  return MATURITY_AGE_BASE * (1 + LONGEVITY_MATURITY_COST * genome.longevity);
}

/**
 * 食べ物から実際に得られる栄養の割合。
 *
 * 一方へ特化するともう一方の効率が落ちる
 * （仕様書 §6「肉食特化 → 植物から得られる栄養低下」「草食特化 → 肉から得られる栄養低下」）。
 * 肉は Phase 3 の捕食で使う。
 */
export function computeDigestionEfficiency(genome: Genome, kind: 'plant' | 'meat'): number {
  const specialized = kind === 'plant' ? genome.plantDigestion : genome.meatDigestion;
  const opposite = kind === 'plant' ? genome.meatDigestion : genome.plantDigestion;

  const efficiency = lerp(DIGESTION_MIN_EFFICIENCY, 1, specialized);
  return efficiency * (1 - CROSS_DIGESTION_PENALTY * opposite);
}

/** 繁殖に必要なエネルギー（絶対値）。 */
export function computeReproductionThreshold(genome: Genome): number {
  return computeEnergyCapacity(genome) * REPRODUCTION_ENERGY_RATIO;
}

/** 繁殖で親が支払うエネルギーの総量。 */
export function computeReproductionCost(genome: Genome): number {
  const capacity = computeEnergyCapacity(genome);
  return capacity * (REPRODUCTION_ENERGY_RATIO - REPRODUCTION_PARENT_REMAINDER_RATIO);
}

/**
 * 子が受け取る初期エネルギー。
 * 繁殖しやすい個体ほど1匹あたりの持参量が減る（仕様書 §6「高繁殖力 → 子の初期エネルギー低下」）。
 */
export function computeOffspringEnergy(parentGenome: Genome, childGenome: Genome): number {
  const paid = computeReproductionCost(parentGenome) * OFFSPRING_ENERGY_SHARE;
  const share = paid * (1 - FERTILITY_OFFSPRING_PENALTY * parentGenome.fertility);

  // 子の器を超えては渡せない
  return Math.min(share, computeEnergyCapacity(childGenome));
}

/** 次に繁殖できるまでの間隔（秒）。fertility が高いほど短い。 */
export function computeReproductionCooldown(genome: Genome): number {
  return lerp(REPRODUCTION_COOLDOWN_MAX, REPRODUCTION_COOLDOWN_MIN, genome.fertility);
}

/**
 * 個体の能力値。Genome から一度だけ算出してキャッシュする。
 *
 * 形質は生涯変わらないため、毎ステップ計算し直す必要がない。
 * 描画・UI専用の値はここへ入れない（仕様書 §12）。
 */
export interface DerivedTraits {
  maxSpeed: number;
  turnRate: number;
  visionRange: number;
  energyCapacity: number;
  basalMetabolism: number;
  movementCost: number;
  maturityAge: number;
  /** 植物から得られる栄養の割合。肉は Phase 3 で使う。 */
  plantEfficiency: number;
  reproductionThreshold: number;
  reproductionCost: number;
  reproductionCooldown: number;
}

/** Genome から能力値一式を求める。 */
export function createDerivedTraits(genome: Genome): DerivedTraits {
  return {
    maxSpeed: computeMaxSpeed(genome),
    turnRate: computeTurnRate(genome),
    visionRange: computeVisionRange(genome),
    energyCapacity: computeEnergyCapacity(genome),
    basalMetabolism: computeBasalMetabolism(genome),
    movementCost: computeMovementCost(genome),
    maturityAge: computeMaturityAge(genome),
    plantEfficiency: computeDigestionEfficiency(genome, 'plant'),
    reproductionThreshold: computeReproductionThreshold(genome),
    reproductionCost: computeReproductionCost(genome),
    reproductionCooldown: computeReproductionCooldown(genome),
  };
}
