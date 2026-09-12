import { FIELD_HALF, FIELD_MARGIN } from '../config/world';
import {
  FOOD_ENERGY_MAX,
  FOOD_ENERGY_MIN,
  FOOD_REGROWTH_WATER_BONUS,
  INITIAL_FOOD_COUNT,
  INITIAL_ROCK_COUNT,
  INITIAL_WATER_COUNT,
  ROCK_RADIUS_MAX,
  ROCK_RADIUS_MIN,
  TERRAIN_PLACEMENT_ATTEMPTS,
  WATER_INFLUENCE_RADIUS,
  WATER_RADIUS_MAX,
  WATER_RADIUS_MIN,
} from '../config/resources';
import type { Random } from '../types';
import type { Food } from './food';
import { distanceToNearestWater, isBlocked, type TerrainFeature } from './terrain';

/**
 * シードから資源と地形を生成する。
 * 同一シードから同一配置になること（仕様書 §4）を保つため、乱数は引数で受け取る。
 */

const BOUND = FIELD_HALF - FIELD_MARGIN;

/** 地形を重ならないように配置する。試行上限に達した分は生成しない。 */
export function generateTerrain(random: Random): TerrainFeature[] {
  const features: TerrainFeature[] = [];

  const place = (kind: TerrainFeature['kind'], count: number, min: number, max: number): void => {
    for (let i = 0; i < count; i += 1) {
      for (let attempt = 0; attempt < TERRAIN_PLACEMENT_ATTEMPTS; attempt += 1) {
        const radius = random.range(min, max);
        const x = random.range(-BOUND + radius, BOUND - radius);
        const z = random.range(-BOUND + radius, BOUND - radius);

        const overlaps = features.some((existing) => {
          const gap = Math.hypot(x - existing.position.x, z - existing.position.z);
          return gap < radius + existing.radius;
        });

        if (!overlaps) {
          features.push({
            id: `${kind}-${i}`,
            kind,
            position: { x, y: 0, z },
            radius,
          });
          break;
        }
      }
    }
  };

  place('water', INITIAL_WATER_COUNT, WATER_RADIUS_MIN, WATER_RADIUS_MAX);
  place('rock', INITIAL_ROCK_COUNT, ROCK_RADIUS_MIN, ROCK_RADIUS_MAX);

  return features;
}

/**
 * 植物性餌を生成する。
 * 地形の上には置かず、水場に近いものほど再生が速くなる。
 */
export function generateFood(random: Random, terrain: readonly TerrainFeature[]): Food[] {
  const foods: Food[] = [];

  for (let i = 0; i < INITIAL_FOOD_COUNT; i += 1) {
    let x = 0;
    let z = 0;
    let placed = false;

    for (let attempt = 0; attempt < TERRAIN_PLACEMENT_ATTEMPTS; attempt += 1) {
      x = random.range(-BOUND, BOUND);
      z = random.range(-BOUND, BOUND);
      if (!isBlocked(terrain, x, z)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      continue;
    }

    const capacity = random.range(FOOD_ENERGY_MIN, FOOD_ENERGY_MAX);

    foods.push({
      id: `food-${i}`,
      position: { x, y: 0, z },
      energy: capacity,
      capacity,
      regrowthDelayRemaining: 0,
      regrowthRate: computeRegrowthRate(terrain, x, z),
    });
  }

  return foods;
}

/**
 * 水場からの距離に応じた再生速度の倍率。
 * 水際で最大、影響半径の外で等倍になるよう線形に補間する。
 */
export function computeRegrowthRate(
  terrain: readonly TerrainFeature[],
  x: number,
  z: number,
): number {
  const distance = distanceToNearestWater(terrain, x, z);
  if (!Number.isFinite(distance) || distance >= WATER_INFLUENCE_RADIUS) {
    return 1;
  }

  const closeness = 1 - distance / WATER_INFLUENCE_RADIUS;
  return 1 + (FOOD_REGROWTH_WATER_BONUS - 1) * closeness;
}
