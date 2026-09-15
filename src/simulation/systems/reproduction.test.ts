import { describe, expect, it } from 'vitest';
import { canReproduce, reproduce } from './reproduction';
import { createRandom } from '../engine/random';
import { MAX_POPULATION } from '../config/genetics';
import { FIELD_BOUND } from '../config/world';
import { computeOffspringEnergy } from '../genetics/traits';
import { makeAnt } from '../../test/antFactory';
import type { Ant } from '../entities/ant';
import type { TerrainFeature } from '../resources/terrain';

/** 繁殖条件を満たした個体。年齢・エネルギー・クールダウンを揃える。 */
function readyAnt(overrides: Partial<Ant> = {}): Ant {
  const base = makeAnt();

  return {
    ...base,
    age: base.traits.maturityAge + 1,
    energy: base.traits.reproductionThreshold,
    reproductionCooldown: 0,
    ...overrides,
  };
}

describe('canReproduce', () => {
  it('成熟・エネルギー・クールダウンを満たせば繁殖できる', () => {
    expect(canReproduce(readyAnt(), 10)).toBe(true);
  });

  it('成熟前は繁殖できない（仕様書 §6 長寿命 → 成熟までの時間増）', () => {
    const ant = readyAnt();

    expect(canReproduce({ ...ant, age: ant.traits.maturityAge - 0.1 }, 10)).toBe(false);
  });

  it('エネルギーが閾値に届かなければ繁殖できない', () => {
    const ant = readyAnt();

    expect(canReproduce({ ...ant, energy: ant.traits.reproductionThreshold - 0.1 }, 10)).toBe(
      false,
    );
  });

  it('クールダウン中は繁殖できない', () => {
    expect(canReproduce(readyAnt({ reproductionCooldown: 0.5 }), 10)).toBe(false);
  });

  it('個体数が上限に達していれば繁殖できない', () => {
    expect(canReproduce(readyAnt(), MAX_POPULATION)).toBe(false);
    expect(canReproduce(readyAnt(), MAX_POPULATION - 1)).toBe(true);
  });
});

describe('reproduce', () => {
  const terrain: TerrainFeature[] = [];

  it('親のエネルギーを繁殖コストぶん減らす', () => {
    const parent = readyAnt();
    const before = parent.energy;

    reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    expect(parent.energy).toBeCloseTo(before - parent.traits.reproductionCost, 10);
  });

  it('親のクールダウンを設定する', () => {
    const parent = readyAnt();
    reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    expect(parent.reproductionCooldown).toBe(parent.traits.reproductionCooldown);
  });

  it('子は世代が1つ進み、系統と親IDを引き継ぐ（仕様書 §6）', () => {
    const parent = readyAnt({ id: 'ant-7', lineageId: 'lineage-3', generation: 4 });
    const { child, record } = reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    expect(child.id).toBe('ant-child');
    expect(child.parentId).toBe('ant-7');
    expect(child.lineageId).toBe('lineage-3');
    expect(child.generation).toBe(5);
    expect(record).toEqual({ antId: 'ant-child', parentId: 'ant-7', generation: 5 });
  });

  it('子は親の形質を継承し、変異する', () => {
    const parent = readyAnt();
    const { child } = reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    expect(child.genome).not.toEqual(parent.genome);
    expect(Math.abs(child.genome.speed - parent.genome.speed)).toBeLessThan(0.3);
  });

  it('子は親の持参分のエネルギーを持つ', () => {
    const parent = readyAnt();
    const { child } = reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    expect(child.energy).toBeCloseTo(computeOffspringEnergy(parent.genome, child.genome), 10);
    expect(child.energy).toBeGreaterThan(0);
  });

  it('子は親の近くに生まれる', () => {
    const parent = readyAnt({ position: { x: 10, y: 0, z: -5 } });
    const { child } = reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    const distance = Math.hypot(
      child.position.x - parent.position.x,
      child.position.z - parent.position.z,
    );

    expect(distance).toBeLessThan(2);
  });

  it('地形の上には生まれない', () => {
    const parent = readyAnt({ position: { x: 0, y: 0, z: 0 } });
    // 親のすぐ隣を岩で塞ぐ。親自身の位置へ退避するため、地形の外側に留まる
    const rocks: TerrainFeature[] = [
      { id: 'rock-0', kind: 'rock', position: { x: 3, y: 0, z: 0 }, radius: 1.5 },
    ];

    const { child } = reproduce(parent, 'ant-child', createRandom('repro'), rocks);
    const distanceToRock = Math.hypot(child.position.x - 3, child.position.z);

    expect(distanceToRock).toBeGreaterThan(1.5);
  });

  it('フィールドの外には生まれない', () => {
    const parent = readyAnt({ position: { x: FIELD_BOUND, y: 0, z: FIELD_BOUND } });

    for (let i = 0; i < 20; i += 1) {
      const { child } = reproduce(
        readyAnt({ ...parent }),
        `ant-${i}`,
        createRandom(`s${i}`),
        terrain,
      );

      expect(Math.abs(child.position.x)).toBeLessThanOrEqual(FIELD_BOUND);
      expect(Math.abs(child.position.z)).toBeLessThanOrEqual(FIELD_BOUND);
    }
  });

  it('子は生まれた直後に繁殖できない', () => {
    const parent = readyAnt();
    const { child } = reproduce(parent, 'ant-child', createRandom('repro'), terrain);

    expect(canReproduce(child, 10)).toBe(false);
    expect(child.age).toBe(0);
  });

  it('同一シードから同一の子になる（決定性）', () => {
    const first = reproduce(readyAnt(), 'ant-child', createRandom('same'), terrain);
    const second = reproduce(readyAnt(), 'ant-child', createRandom('same'), terrain);

    expect(first.child).toEqual(second.child);
  });
});
