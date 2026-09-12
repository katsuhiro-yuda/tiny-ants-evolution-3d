import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type World } from './world';
import { FIELD_HALF, FIELD_MARGIN, INITIAL_ANT_COUNT } from '../config/world';
import { FIXED_TIMESTEP_SECONDS } from '../config/time';
import { LIFESPAN_MAX_SECONDS, MAX_ENERGY } from '../config/biology';
import { isBlocked } from '../resources/terrain';

const BOUND = FIELD_HALF - FIELD_MARGIN;

function positionsOf(world: World) {
  return world.ants.map((ant) => ({ ...ant.position }));
}

/** 指定秒数ぶん世界を進める。 */
function run(world: World, seconds: number): void {
  const steps = Math.round(seconds / FIXED_TIMESTEP_SECONDS);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(world, FIXED_TIMESTEP_SECONDS);
  }
}

describe('createWorld', () => {
  it('既定で仕様どおりの個体数を生成する', () => {
    expect(createWorld('seed').ants).toHaveLength(INITIAL_ANT_COUNT);
  });

  it('餌と地形を生成する', () => {
    const world = createWorld('resources');

    expect(world.foods.length).toBeGreaterThan(0);
    expect(world.terrain.some((feature) => feature.kind === 'water')).toBe(true);
    expect(world.terrain.some((feature) => feature.kind === 'rock')).toBe(true);
  });

  it('同一シードから同一の初期状態を再現する', () => {
    const a = createWorld('tiny-ants');
    const b = createWorld('tiny-ants');

    expect(positionsOf(a)).toEqual(positionsOf(b));
    expect(a.foods.map((food) => food.position)).toEqual(b.foods.map((food) => food.position));
    expect(a.terrain).toEqual(b.terrain);
  });

  it('異なるシードでは異なる初期状態になる', () => {
    expect(positionsOf(createWorld('seed-a'))).not.toEqual(positionsOf(createWorld('seed-b')));
  });

  it('蟻を地形の上に配置しない', () => {
    const world = createWorld('spawn');

    for (const ant of world.ants) {
      expect(isBlocked(world.terrain, ant.position.x, ant.position.z)).toBe(false);
    }
  });

  it('餌を地形の上に配置しない', () => {
    const world = createWorld('food-spawn');

    for (const food of world.foods) {
      expect(isBlocked(world.terrain, food.position.x, food.position.z)).toBe(false);
    }
  });

  it('全個体が境界内へ配置される', () => {
    for (const ant of createWorld('bounds', 300).ants) {
      expect(Math.abs(ant.position.x)).toBeLessThanOrEqual(BOUND);
      expect(Math.abs(ant.position.z)).toBeLessThanOrEqual(BOUND);
    }
  });

  it('意思決定タイミングが個体ごとにずれている', () => {
    const cooldowns = new Set(createWorld('stagger').ants.map((ant) => ant.decisionCooldown));

    // 全個体が同一ステップで判断すると負荷が偏る（仕様書 §7）
    expect(cooldowns.size).toBeGreaterThan(50);
  });

  it('寿命が個体ごとにばらついている', () => {
    const world = createWorld('lifespan');
    const lifespans = world.ants.map((ant) => ant.lifespan);

    expect(new Set(lifespans).size).toBeGreaterThan(50);
    expect(Math.max(...lifespans)).toBeLessThanOrEqual(LIFESPAN_MAX_SECONDS);
  });
});

describe('stepWorld', () => {
  it('同一シード・同一ステップ数なら同一状態になる（決定性）', () => {
    const a = createWorld('determinism');
    const b = createWorld('determinism');

    run(a, 30);
    run(b, 30);

    expect(positionsOf(a)).toEqual(positionsOf(b));
    expect(a.ants.map((ant) => ant.energy)).toEqual(b.ants.map((ant) => ant.energy));
    expect(a.deathCount).toBe(b.deathCount);
  });

  it('tickと経過時間がステップに応じて進む', () => {
    const world = createWorld('clock');
    run(world, 1);

    expect(world.tick).toBe(60);
    expect(world.elapsedSeconds).toBeCloseTo(1, 8);
  });

  it('蟻が境界と地形の外へ出ない', () => {
    const world = createWorld('containment', 150);
    run(world, 40);

    for (const ant of world.ants) {
      expect(Math.abs(ant.position.x)).toBeLessThanOrEqual(BOUND + 1e-9);
      expect(Math.abs(ant.position.z)).toBeLessThanOrEqual(BOUND + 1e-9);
      expect(isBlocked(world.terrain, ant.position.x, ant.position.z)).toBe(false);
    }
  });

  it('蟻が餌を食べてエネルギーを回復する（Phase 1完了条件）', () => {
    const world = createWorld('feeding');
    const totalFoodBefore = world.foods.reduce((sum, food) => sum + food.energy, 0);

    // 初期エネルギーより回復した個体が現れるまで進める
    run(world, 25);

    const totalFoodAfter = world.foods.reduce((sum, food) => sum + food.energy, 0);
    const recovered = world.ants.filter((ant) => ant.energy > MAX_ENERGY * 0.9);

    expect(totalFoodAfter).toBeLessThan(totalFoodBefore);
    expect(recovered.length).toBeGreaterThan(0);
  });

  it('採食行動が実際に発生する', () => {
    const world = createWorld('states');
    const seen = new Set<string>();

    for (let i = 0; i < 60 * 30; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
      for (const ant of world.ants) {
        seen.add(ant.state);
      }
    }

    expect(seen).toContain('Explore');
    expect(seen).toContain('SeekFood');
    expect(seen).toContain('Eat');
  });

  it('エネルギー切れで死亡する（Phase 1完了条件）', () => {
    const world = createWorld('starvation', 40);
    // 餌を全て取り除き、回復手段をなくす
    world.foods.length = 0;

    run(world, 200);

    expect(world.ants).toHaveLength(0);
    expect(world.deathCount).toBe(40);
  });

  it('餓死の死因を記録する', () => {
    const world = createWorld('starvation-cause', 5);
    world.foods.length = 0;

    const causes = new Set<string>();
    for (let i = 0; i < 60 * 200 && world.ants.length > 0; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
      for (const death of world.recentDeaths) {
        causes.add(death.cause);
      }
    }

    expect(causes).toEqual(new Set(['starvation']));
  });

  it('寿命で死亡する（Phase 1完了条件）', () => {
    const world = createWorld('old-age', 5);
    // 餓死しないようエネルギーを満たし続ける
    const causes = new Set<string>();

    for (let i = 0; i < 60 * (LIFESPAN_MAX_SECONDS + 5) && world.ants.length > 0; i += 1) {
      for (const ant of world.ants) {
        ant.energy = MAX_ENERGY;
      }
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
      for (const death of world.recentDeaths) {
        causes.add(death.cause);
      }
    }

    expect(causes).toEqual(new Set(['oldAge']));
    expect(world.ants).toHaveLength(0);
  });

  it('recentDeaths はステップごとに初期化される', () => {
    const world = createWorld('deaths-reset', 3);
    world.foods.length = 0;

    let sawDeath = false;
    for (let i = 0; i < 60 * 200 && world.ants.length > 0; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
      if (world.recentDeaths.length > 0) {
        sawDeath = true;
      }
    }

    expect(sawDeath).toBe(true);
    // 全滅後のステップでは空になる
    stepWorld(world, FIXED_TIMESTEP_SECONDS);
    expect(world.recentDeaths).toEqual([]);
  });

  it('餌が再生する', () => {
    const world = createWorld('regrowth', 1);
    for (const food of world.foods) {
      food.energy = 0;
      food.regrowthDelayRemaining = 0;
    }

    run(world, 30);

    expect(world.foods.some((food) => food.energy > 0)).toBe(true);
  });
});
