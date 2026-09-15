import { describe, expect, it } from 'vitest';
import { BEHAVIOR_LABELS, findAntSummary, toAntSummary } from './antSummary';
import { collectWorldStats } from './worldStats';
import { createWorld, stepWorld } from '../engine/world';
import { FIXED_TIMESTEP_SECONDS } from '../config/time';
import { computeFeatureThresholds } from '../genetics/ecotype';
import { makeAnt as buildAnt } from '../../test/antFactory';
import type { Ant } from '../entities/ant';

/** 個体詳細の検証で使う蟻。エネルギーは上限の半分に揃える。 */
function makeAnt(overrides: Partial<Ant> = {}): Ant {
  const base = buildAnt({
    overrides: {
      id: 'ant-1',
      lineageId: 'lineage-1',
      position: { x: 3, y: 0, z: -4 },
      age: 12,
      lifespan: 200,
    },
  });

  return { ...base, energy: base.traits.energyCapacity / 2, ...overrides };
}

/** 特徴ラベルの閾値。個体群を渡さない検証では、その集団だけから作る。 */
function thresholdsOf(ants: readonly Ant[]) {
  return computeFeatureThresholds(ants.map((ant) => ant.genome));
}

describe('toAntSummary', () => {
  it('エネルギーを0〜1へ正規化する', () => {
    expect(toAntSummary(makeAnt(), thresholdsOf([])).energyRatio).toBeCloseTo(0.5, 10);
  });

  it('位置はXZのみを渡す（描画用のyを持ち込まない）', () => {
    expect(toAntSummary(makeAnt(), thresholdsOf([])).position).toEqual({ x: 3, z: -4 });
  });

  it('年齢と寿命をそのまま渡す', () => {
    const summary = toAntSummary(makeAnt({ age: 30, lifespan: 180 }), thresholdsOf([]));

    expect(summary.ageSeconds).toBe(30);
    expect(summary.lifespanSeconds).toBe(180);
  });
});

describe('findAntSummary', () => {
  const ants = [makeAnt({ id: 'ant-1' }), makeAnt({ id: 'ant-2' })];

  it('IDで個体を見つける', () => {
    expect(findAntSummary(ants, 'ant-2', thresholdsOf(ants))?.id).toBe('ant-2');
  });

  it('未選択なら undefined', () => {
    expect(findAntSummary(ants, undefined, thresholdsOf(ants))).toBeUndefined();
  });

  it('死亡した個体のIDなら undefined', () => {
    expect(findAntSummary(ants, 'ant-99', thresholdsOf(ants))).toBeUndefined();
  });
});

describe('BEHAVIOR_LABELS', () => {
  it('全ての行動状態に日本語ラベルがある', () => {
    expect(Object.values(BEHAVIOR_LABELS).every((label) => label.length > 0)).toBe(true);
    expect(Object.keys(BEHAVIOR_LABELS)).toEqual([
      'Explore',
      'SeekFood',
      'Eat',
      'Rest',
      'Reproduce',
    ]);
  });
});

describe('collectWorldStats', () => {
  it('初期世界の統計を集計する', () => {
    const stats = collectWorldStats(createWorld('stats', 50));

    expect(stats.population).toBe(50);
    expect(stats.deathCount).toBe(0);
    expect(stats.elapsedSeconds).toBe(0);
    expect(stats.behaviorCounts.Explore).toBe(50);
    expect(stats.edibleFoodCount).toBeGreaterThan(0);
  });

  it('行動構成の合計が個体数と一致する', () => {
    const world = createWorld('stats-behavior');
    for (let i = 0; i < 600; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
    }

    const stats = collectWorldStats(world);
    const total = Object.values(stats.behaviorCounts).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(stats.population);
  });

  it('個体がいなければ平均エネルギーは0', () => {
    const world = createWorld('stats-empty', 1);
    world.ants.length = 0;

    expect(collectWorldStats(world).averageEnergyRatio).toBe(0);
  });

  it('食べられない餌を数えない', () => {
    const world = createWorld('stats-food', 1);
    for (const food of world.foods) {
      food.energy = 0;
    }

    expect(collectWorldStats(world).edibleFoodCount).toBe(0);
  });
});
