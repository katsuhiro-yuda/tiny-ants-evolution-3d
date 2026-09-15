import type { AntBehaviorState } from '../behaviors/types';
import type { World } from '../engine/world';
import { isEdible } from '../resources/food';
import { GENOME_KEYS, type GenomeKey } from '../genetics/genome';
import {
  computeDiet,
  computeFeatureThresholds,
  type DietType,
  type FeatureThresholds,
} from '../genetics/ecotype';

/**
 * 統計の集計（仕様書 §10）。
 * Phase 2 では個体数・出生死亡・行動構成・世代・形質分布・生態型構成まで。
 * コロニー別の集計は Phase 4 で追加する。
 */
export interface WorldStats {
  population: number;
  deathCount: number;
  birthCount: number;
  elapsedSeconds: number;
  /** 0〜1で正規化した平均エネルギー。個体がいなければ0。 */
  averageEnergyRatio: number;
  behaviorCounts: Record<AntBehaviorState, number>;
  /** 食べられる状態の餌の数。 */
  edibleFoodCount: number;

  /** これまでに到達した最大世代。 */
  maxGeneration: number;
  /** 現存個体の平均世代。 */
  averageGeneration: number;
  /** 食性の構成（仕様書 §10「草食、肉食、雑食の割合」）。 */
  dietCounts: Record<DietType, number>;
  /** 形質ごとの平均値。 */
  traitMeans: Record<GenomeKey, number>;
  /** 形質ごとの標準偏差。分布の広がりを見る。 */
  traitDeviations: Record<GenomeKey, number>;
  /** 特徴ラベルの判定に使う上位20%の境界値。個体詳細と共有する。 */
  featureThresholds: FeatureThresholds;
}

function emptyTraitRecord(): Record<GenomeKey, number> {
  const record = {} as Record<GenomeKey, number>;
  for (const key of GENOME_KEYS) {
    record[key] = 0;
  }
  return record;
}

export function collectWorldStats(world: World): WorldStats {
  const behaviorCounts: Record<AntBehaviorState, number> = {
    Explore: 0,
    SeekFood: 0,
    Eat: 0,
    Rest: 0,
    Reproduce: 0,
  };

  const dietCounts: Record<DietType, number> = { herbivore: 0, carnivore: 0, omnivore: 0 };
  const traitMeans = emptyTraitRecord();
  const traitDeviations = emptyTraitRecord();

  let energyRatioSum = 0;
  let generationSum = 0;

  for (const ant of world.ants) {
    behaviorCounts[ant.state] += 1;
    dietCounts[computeDiet(ant.genome)] += 1;
    // 上限は個体ごとに異なるため、比率にしてから平均する
    energyRatioSum += ant.energy / ant.traits.energyCapacity;
    generationSum += ant.generation;

    for (const key of GENOME_KEYS) {
      traitMeans[key] += ant.genome[key];
    }
  }

  const population = world.ants.length;

  if (population > 0) {
    for (const key of GENOME_KEYS) {
      traitMeans[key] /= population;
    }

    for (const ant of world.ants) {
      for (const key of GENOME_KEYS) {
        const difference = ant.genome[key] - traitMeans[key];
        traitDeviations[key] += difference * difference;
      }
    }

    for (const key of GENOME_KEYS) {
      traitDeviations[key] = Math.sqrt(traitDeviations[key] / population);
    }
  }

  let edibleFoodCount = 0;
  for (const food of world.foods) {
    if (isEdible(food)) {
      edibleFoodCount += 1;
    }
  }

  return {
    population,
    deathCount: world.deathCount,
    birthCount: world.birthCount,
    elapsedSeconds: world.elapsedSeconds,
    averageEnergyRatio: population > 0 ? energyRatioSum / population : 0,
    behaviorCounts,
    edibleFoodCount,
    maxGeneration: world.maxGeneration,
    averageGeneration: population > 0 ? generationSum / population : 0,
    dietCounts,
    traitMeans,
    traitDeviations,
    featureThresholds: computeFeatureThresholds(world.ants.map((ant) => ant.genome)),
  };
}
