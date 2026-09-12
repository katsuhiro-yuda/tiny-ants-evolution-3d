import { describe, expect, it } from 'vitest';
import { BEHAVIOR_LABELS, findAntSummary, toAntSummary } from './antSummary';
import { collectWorldStats } from './worldStats';
import { createWorld, stepWorld } from '../engine/world';
import { FIXED_TIMESTEP_SECONDS } from '../config/time';
import { MAX_ENERGY } from '../config/biology';
import type { Ant } from '../entities/ant';

function makeAnt(overrides: Partial<Ant> = {}): Ant {
  return {
    id: 'ant-1',
    lineageId: 'lineage-1',
    generation: 0,
    position: { x: 3, y: 0, z: -4 },
    velocity: { x: 0, y: 0, z: 0 },
    heading: 0,
    age: 12,
    lifespan: 200,
    energy: MAX_ENERGY / 2,
    state: 'Explore',
    decisionCooldown: 0,
    wanderHeading: 0,
    ...overrides,
  };
}

describe('toAntSummary', () => {
  it('エネルギーを0〜1へ正規化する', () => {
    expect(toAntSummary(makeAnt()).energyRatio).toBeCloseTo(0.5, 10);
  });

  it('位置はXZのみを渡す（描画用のyを持ち込まない）', () => {
    expect(toAntSummary(makeAnt()).position).toEqual({ x: 3, z: -4 });
  });

  it('年齢と寿命をそのまま渡す', () => {
    const summary = toAntSummary(makeAnt({ age: 30, lifespan: 180 }));

    expect(summary.ageSeconds).toBe(30);
    expect(summary.lifespanSeconds).toBe(180);
  });
});

describe('findAntSummary', () => {
  const ants = [makeAnt({ id: 'ant-1' }), makeAnt({ id: 'ant-2' })];

  it('IDで個体を見つける', () => {
    expect(findAntSummary(ants, 'ant-2')?.id).toBe('ant-2');
  });

  it('未選択なら undefined', () => {
    expect(findAntSummary(ants, undefined)).toBeUndefined();
  });

  it('死亡した個体のIDなら undefined', () => {
    expect(findAntSummary(ants, 'ant-99')).toBeUndefined();
  });
});

describe('BEHAVIOR_LABELS', () => {
  it('全ての行動状態に日本語ラベルがある', () => {
    expect(Object.values(BEHAVIOR_LABELS).every((label) => label.length > 0)).toBe(true);
    expect(Object.keys(BEHAVIOR_LABELS)).toEqual(['Explore', 'SeekFood', 'Eat', 'Rest']);
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
