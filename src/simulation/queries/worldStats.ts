import type { AntBehaviorState } from '../behaviors/types';
import type { World } from '../engine/world';
import { MAX_ENERGY } from '../config/biology';

/**
 * 統計の集計（仕様書 §10）。
 * Phase 1 では個体数・死亡数・行動構成・平均エネルギーのみ。
 * 世代や形質の統計は Phase 2 で追加する。
 */
export interface WorldStats {
  population: number;
  deathCount: number;
  elapsedSeconds: number;
  /** 0〜1で正規化した平均エネルギー。個体がいなければ0。 */
  averageEnergyRatio: number;
  behaviorCounts: Record<AntBehaviorState, number>;
  /** 食べられる状態の餌の数。 */
  edibleFoodCount: number;
}

export function collectWorldStats(world: World): WorldStats {
  const behaviorCounts: Record<AntBehaviorState, number> = {
    Explore: 0,
    SeekFood: 0,
    Eat: 0,
    Rest: 0,
  };

  let energySum = 0;
  for (const ant of world.ants) {
    behaviorCounts[ant.state] += 1;
    energySum += ant.energy;
  }

  let edibleFoodCount = 0;
  for (const food of world.foods) {
    if (food.energy > 0) {
      edibleFoodCount += 1;
    }
  }

  const population = world.ants.length;

  return {
    population,
    deathCount: world.deathCount,
    elapsedSeconds: world.elapsedSeconds,
    averageEnergyRatio: population > 0 ? energySum / population / MAX_ENERGY : 0,
    behaviorCounts,
    edibleFoodCount,
  };
}
