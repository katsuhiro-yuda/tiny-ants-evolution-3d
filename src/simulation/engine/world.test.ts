import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from './world';
import { FIELD_HALF, FIELD_MARGIN, INITIAL_ANT_COUNT } from '../config/world';
import { FIXED_TIMESTEP_SECONDS } from '../config/time';

const BOUND = FIELD_HALF - FIELD_MARGIN;

function positionsOf(world: ReturnType<typeof createWorld>) {
  return world.ants.map((ant) => ({ ...ant.position }));
}

describe('createWorld', () => {
  it('既定で仕様どおりの個体数を生成する', () => {
    expect(createWorld('seed').ants).toHaveLength(INITIAL_ANT_COUNT);
  });

  it('同一シードから同一の初期配置を再現する（Phase 0完了条件）', () => {
    const a = createWorld('tiny-ants');
    const b = createWorld('tiny-ants');

    expect(positionsOf(a)).toEqual(positionsOf(b));
    expect(a.ants.map((ant) => ant.heading)).toEqual(b.ants.map((ant) => ant.heading));
  });

  it('異なるシードでは異なる初期配置になる', () => {
    expect(positionsOf(createWorld('seed-a'))).not.toEqual(positionsOf(createWorld('seed-b')));
  });

  it('全個体が境界内へ配置される', () => {
    for (const ant of createWorld('bounds', 500).ants) {
      expect(Math.abs(ant.position.x)).toBeLessThanOrEqual(BOUND);
      expect(Math.abs(ant.position.z)).toBeLessThanOrEqual(BOUND);
      expect(ant.position.y).toBe(0);
    }
  });

  it('個体IDが重複しない', () => {
    const world = createWorld('ids');
    expect(new Set(world.ants.map((ant) => ant.id)).size).toBe(world.ants.length);
  });

  it('初期世代は0で経過時間も0', () => {
    const world = createWorld('init');

    expect(world.tick).toBe(0);
    expect(world.elapsedSeconds).toBe(0);
    expect(world.ants.every((ant) => ant.generation === 0)).toBe(true);
  });
});

describe('stepWorld', () => {
  it('同一シード・同一ステップ数なら同一状態になる（決定性）', () => {
    const a = createWorld('determinism');
    const b = createWorld('determinism');

    for (let i = 0; i < 600; i += 1) {
      stepWorld(a, FIXED_TIMESTEP_SECONDS);
      stepWorld(b, FIXED_TIMESTEP_SECONDS);
    }

    expect(positionsOf(a)).toEqual(positionsOf(b));
    expect(a.tick).toBe(b.tick);
  });

  it('長時間実行しても全個体が境界内に留まる', () => {
    const world = createWorld('long-run', 200);

    for (let i = 0; i < 3000; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
    }

    for (const ant of world.ants) {
      expect(Math.abs(ant.position.x)).toBeLessThanOrEqual(BOUND + 1e-9);
      expect(Math.abs(ant.position.z)).toBeLessThanOrEqual(BOUND + 1e-9);
    }
  });

  it('tickと経過時間がステップに応じて進む', () => {
    const world = createWorld('clock');

    for (let i = 0; i < 60; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
    }

    expect(world.tick).toBe(60);
    expect(world.elapsedSeconds).toBeCloseTo(1, 10);
  });

  it('個体が実際に移動する', () => {
    const world = createWorld('movement');
    const before = positionsOf(world);
    stepWorld(world, FIXED_TIMESTEP_SECONDS);

    expect(positionsOf(world)).not.toEqual(before);
  });

  it('境界で反射し速度の向きが反転する', () => {
    const world = createWorld('reflect', 1);
    const ant = world.ants[0];
    ant.position.x = BOUND;
    ant.position.z = 0;
    ant.velocity.x = 10;
    ant.velocity.z = 0;

    stepWorld(world, FIXED_TIMESTEP_SECONDS);

    expect(ant.velocity.x).toBeLessThan(0);
    expect(ant.position.x).toBeLessThanOrEqual(BOUND);
  });

  it('headingが進行方向と一致する', () => {
    const world = createWorld('heading', 1);
    const ant = world.ants[0];
    ant.position.x = 0;
    ant.position.z = 0;
    ant.velocity.x = 0;
    ant.velocity.z = 2;

    stepWorld(world, FIXED_TIMESTEP_SECONDS);

    expect(ant.heading).toBeCloseTo(Math.PI / 2, 10);
  });
});
