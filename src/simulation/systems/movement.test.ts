import { describe, expect, it } from 'vitest';
import { headingTo, moveAnt, normalizeAngle, turnToward } from './movement';
import { FIELD_BOUND } from '../config/world';
import { createInitialGenome } from '../genetics/genome';
import { createDerivedTraits } from '../genetics/traits';
import { createRandom } from '../engine/random';
import type { Ant } from '../entities/ant';
import type { TerrainFeature } from '../resources/terrain';

const TIMESTEP = 1 / 60;

/** 旋回速度の検証で使う基準値。形質に依存しない値を明示的に与える。 */
const TURN_RATE = Math.PI;

/** 旋回と移動の検証に必要な最小限の蟻を作る。 */
function makeAnt(overrides: Partial<Ant> = {}): Ant {
  const genome = createInitialGenome(createRandom('movement-test'));

  return {
    id: 'ant-test',
    lineageId: 'lineage-test',
    generation: 0,
    genome,
    traits: { ...createDerivedTraits(genome), turnRate: TURN_RATE },
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    heading: 0,
    age: 0,
    lifespan: 200,
    energy: 50,
    state: 'Explore',
    decisionCooldown: 0,
    wanderHeading: 0,
    reproductionCooldown: 0,
    ...overrides,
  };
}

function rock(x: number, z: number, radius: number): TerrainFeature {
  return { id: 'rock-test', kind: 'rock', position: { x, y: 0, z }, radius };
}

describe('normalizeAngle', () => {
  it('範囲内の角度はそのまま返す', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0, 10);
    expect(normalizeAngle(1.5)).toBeCloseTo(1.5, 10);
    expect(normalizeAngle(-1.5)).toBeCloseTo(-1.5, 10);
  });

  it('2πを超える角度を範囲内へ折り返す', () => {
    expect(normalizeAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5, 10);
    expect(normalizeAngle(Math.PI * 4 + 0.5)).toBeCloseTo(0.5, 10);
  });

  it('-2πを下回る角度を範囲内へ折り返す', () => {
    expect(normalizeAngle(-Math.PI * 2 - 0.5)).toBeCloseTo(-0.5, 10);
    expect(normalizeAngle(-Math.PI * 4 - 0.5)).toBeCloseTo(-0.5, 10);
  });

  it('どんな入力でも -π〜π に収まる', () => {
    for (let angle = -20; angle <= 20; angle += 0.37) {
      const normalized = normalizeAngle(angle);
      expect(normalized).toBeGreaterThanOrEqual(-Math.PI);
      expect(normalized).toBeLessThanOrEqual(Math.PI);
    }
  });
});

describe('turnToward', () => {
  it('旋回上限内なら目標方位へ到達する', () => {
    const target = 0.01;
    expect(turnToward(0, target, TURN_RATE, TIMESTEP)).toBeCloseTo(target, 10);
  });

  it('1ステップの旋回量が上限を超えない', () => {
    const result = turnToward(0, Math.PI, TURN_RATE, TIMESTEP);
    expect(Math.abs(result)).toBeCloseTo(TURN_RATE * TIMESTEP, 10);
  });

  it('目標を行き過ぎない', () => {
    // 上限ぎりぎりの差分。行き過ぎると符号が反転して振動する
    const target = TURN_RATE * TIMESTEP * 0.9;
    expect(turnToward(0, target, TURN_RATE, TIMESTEP)).toBeCloseTo(target, 10);
  });

  it('境界をまたぐときに遠回りしない', () => {
    // 3.0 から -3.0 への最短経路は +側（π をまたぐ）で、差は約0.28
    const result = turnToward(3.0, -3.0, TURN_RATE, TIMESTEP);
    expect(result).toBeGreaterThan(3.0);
  });

  it('戻り値が常に -π〜π に収まる', () => {
    const result = turnToward(3.1, -3.1, TURN_RATE, TIMESTEP);
    expect(result).toBeGreaterThanOrEqual(-Math.PI);
    expect(result).toBeLessThanOrEqual(Math.PI);
  });
});

describe('moveAnt', () => {
  it('速度と時間に比例した距離を進む', () => {
    const ant = makeAnt();
    const moved = moveAnt(ant, 0, 3, TIMESTEP, []);

    expect(moved).toBeCloseTo(3 * TIMESTEP, 10);
    expect(ant.position.x).toBeCloseTo(3 * TIMESTEP, 10);
  });

  it('速度0では移動せず velocity がゼロになる', () => {
    const ant = makeAnt({ velocity: { x: 5, y: 0, z: 5 } });
    const moved = moveAnt(ant, 0, 0, TIMESTEP, []);

    expect(moved).toBe(0);
    expect(ant.position.x).toBe(0);
    expect(ant.velocity.x).toBe(0);
    expect(ant.velocity.z).toBe(0);
  });

  it('速度0でも旋回だけは行う', () => {
    const ant = makeAnt();
    moveAnt(ant, Math.PI / 2, 0, TIMESTEP, []);

    expect(ant.heading).toBeGreaterThan(0);
  });

  it('地形に阻まれたら位置を変えず0を返す', () => {
    const ant = makeAnt();
    const terrain = [rock(1, 0, 0.95)];
    const moved = moveAnt(ant, 0, 3, TIMESTEP, terrain);

    expect(moved).toBe(0);
    expect(ant.position.x).toBe(0);
    expect(ant.position.z).toBe(0);
    expect(ant.velocity.x).toBe(0);
  });

  it('地形に阻まれたら方位を反転して次ステップで別方向を試す', () => {
    const ant = makeAnt();
    moveAnt(ant, 0, 3, TIMESTEP, [rock(1, 0, 0.95)]);

    expect(Math.abs(normalizeAngle(ant.heading - Math.PI))).toBeLessThan(1e-9);
  });

  it('フィールド境界を越えない', () => {
    const ant = makeAnt({ position: { x: FIELD_BOUND - 0.001, y: 0, z: 0 }, heading: 0 });
    const moved = moveAnt(ant, 0, 3, TIMESTEP, []);

    expect(moved).toBe(0);
    expect(ant.position.x).toBeLessThanOrEqual(FIELD_BOUND);
  });

  it('移動できたときは velocity が進行方向と速度を表す', () => {
    const ant = makeAnt();
    moveAnt(ant, 0, 2, TIMESTEP, []);

    expect(ant.velocity.x).toBeCloseTo(2, 10);
    expect(ant.velocity.z).toBeCloseTo(0, 10);
  });
});

describe('headingTo', () => {
  it('+X方向は0', () => {
    expect(headingTo(0, 0, 1, 0)).toBeCloseTo(0, 10);
  });

  it('+Z方向はπ/2', () => {
    expect(headingTo(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('起点が原点でなくても相対方位を返す', () => {
    expect(headingTo(5, 5, 6, 5)).toBeCloseTo(0, 10);
  });
});
