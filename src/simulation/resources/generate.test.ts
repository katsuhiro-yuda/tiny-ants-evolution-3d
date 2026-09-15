import { describe, expect, it } from 'vitest';
import { computeRegrowthRate, generateFood, generateTerrain } from './generate';
import { isBlocked, type TerrainFeature } from './terrain';
import { createRandom } from '../engine/random';
import { FIELD_BOUND } from '../config/world';
import {
  FOOD_ENERGY_MAX,
  FOOD_ENERGY_MIN,
  FOOD_REGROWTH_WATER_BONUS,
  INITIAL_ROCK_COUNT,
  INITIAL_WATER_COUNT,
  WATER_INFLUENCE_RADIUS,
} from '../config/resources';

function water(x: number, z: number, radius: number): TerrainFeature {
  return { id: 'water-test', kind: 'water', position: { x, y: 0, z }, radius };
}

describe('generateTerrain', () => {
  it('同一シードから同一の地形を生成する', () => {
    expect(generateTerrain(createRandom('terrain'))).toEqual(
      generateTerrain(createRandom('terrain')),
    );
  });

  it('水場と岩を生成する（試行上限で減ることはあるが増えない）', () => {
    const features = generateTerrain(createRandom('kinds'));
    const waters = features.filter((feature) => feature.kind === 'water');
    const rocks = features.filter((feature) => feature.kind === 'rock');

    expect(waters.length).toBeGreaterThan(0);
    expect(waters.length).toBeLessThanOrEqual(INITIAL_WATER_COUNT);
    expect(rocks.length).toBeGreaterThan(0);
    expect(rocks.length).toBeLessThanOrEqual(INITIAL_ROCK_COUNT);
  });

  it('地形同士が重ならない', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const features = generateTerrain(createRandom(seed));

      for (let i = 0; i < features.length; i += 1) {
        for (let j = i + 1; j < features.length; j += 1) {
          const a = features[i];
          const b = features[j];
          const gap = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);

          expect(gap).toBeGreaterThanOrEqual(a.radius + b.radius);
        }
      }
    }
  });

  it('円がフィールド境界からはみ出さない', () => {
    for (const feature of generateTerrain(createRandom('bounds'))) {
      expect(feature.position.x - feature.radius).toBeGreaterThanOrEqual(-FIELD_BOUND);
      expect(feature.position.x + feature.radius).toBeLessThanOrEqual(FIELD_BOUND);
      expect(feature.position.z - feature.radius).toBeGreaterThanOrEqual(-FIELD_BOUND);
      expect(feature.position.z + feature.radius).toBeLessThanOrEqual(FIELD_BOUND);
    }
  });
});

describe('generateFood', () => {
  it('同一シード・同一地形から同一の餌を生成する', () => {
    const terrain = generateTerrain(createRandom('shared'));

    expect(generateFood(createRandom('food'), terrain)).toEqual(
      generateFood(createRandom('food'), terrain),
    );
  });

  it('地形の上に置かない', () => {
    const terrain = generateTerrain(createRandom('overlap'));

    for (const food of generateFood(createRandom('food'), terrain)) {
      expect(isBlocked(terrain, food.position.x, food.position.z)).toBe(false);
    }
  });

  it('容量が設定範囲に収まり、初期状態で満量になる', () => {
    for (const food of generateFood(createRandom('capacity'), [])) {
      expect(food.capacity).toBeGreaterThanOrEqual(FOOD_ENERGY_MIN);
      expect(food.capacity).toBeLessThanOrEqual(FOOD_ENERGY_MAX);
      expect(food.energy).toBe(food.capacity);
      expect(food.regrowthDelayRemaining).toBe(0);
    }
  });

  it('フィールド境界の内側へ配置する', () => {
    for (const food of generateFood(createRandom('bounds'), [])) {
      expect(Math.abs(food.position.x)).toBeLessThanOrEqual(FIELD_BOUND);
      expect(Math.abs(food.position.z)).toBeLessThanOrEqual(FIELD_BOUND);
    }
  });
});

describe('computeRegrowthRate', () => {
  it('水場がなければ等倍', () => {
    expect(computeRegrowthRate([], 0, 0)).toBe(1);
  });

  it('岩だけでは倍率が変わらない', () => {
    const rocks: TerrainFeature[] = [
      { id: 'rock-0', kind: 'rock', position: { x: 0, y: 0, z: 0 }, radius: 3 },
    ];

    expect(computeRegrowthRate(rocks, 1, 0)).toBe(1);
  });

  it('水際で最大倍率になる', () => {
    const terrain = [water(0, 0, 5)];

    // 縁からの距離0
    expect(computeRegrowthRate(terrain, 5, 0)).toBeCloseTo(FOOD_REGROWTH_WATER_BONUS, 10);
  });

  it('影響半径の外では等倍になる', () => {
    const terrain = [water(0, 0, 5)];

    expect(computeRegrowthRate(terrain, 5 + WATER_INFLUENCE_RADIUS, 0)).toBe(1);
    expect(computeRegrowthRate(terrain, 5 + WATER_INFLUENCE_RADIUS + 10, 0)).toBe(1);
  });

  it('距離に対して線形に補間する', () => {
    const terrain = [water(0, 0, 5)];
    const half = computeRegrowthRate(terrain, 5 + WATER_INFLUENCE_RADIUS / 2, 0);

    expect(half).toBeCloseTo(1 + (FOOD_REGROWTH_WATER_BONUS - 1) * 0.5, 10);
  });

  it('近いほど倍率が高い', () => {
    const terrain = [water(0, 0, 5)];
    const near = computeRegrowthRate(terrain, 6, 0);
    const far = computeRegrowthRate(terrain, 12, 0);

    expect(near).toBeGreaterThan(far);
  });

  it('複数の水場では最も近いものを基準にする', () => {
    const terrain = [water(-30, 0, 4), water(0, 0, 5)];

    expect(computeRegrowthRate(terrain, 5, 0)).toBeCloseTo(FOOD_REGROWTH_WATER_BONUS, 10);
  });
});
