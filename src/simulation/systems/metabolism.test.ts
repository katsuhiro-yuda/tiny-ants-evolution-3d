import { describe, expect, it } from 'vitest';
import {
  clampEnergy,
  computeEnergyCost,
  isStarved,
  isTooOld,
  type MetabolicTraits,
} from './metabolism';
import { REST_METABOLISM_MULTIPLIER } from '../config/biology';

const TIMESTEP = 1 / 60;

/** 係数の影響を分離して見るため、基礎代謝と移動単価は固定値を与える。 */
const traits: MetabolicTraits = { basalMetabolism: 0.5, movementCost: 0.22 };

describe('computeEnergyCost', () => {
  it('静止していても基礎代謝を消費する', () => {
    expect(computeEnergyCost(traits, 0, 1, false)).toBeCloseTo(traits.basalMetabolism, 10);
  });

  it('移動距離に比例してコストが増える', () => {
    const short = computeEnergyCost(traits, 1, TIMESTEP, false);
    const long = computeEnergyCost(traits, 2, TIMESTEP, false);

    expect(long - short).toBeCloseTo(traits.movementCost, 10);
  });

  it('休息中は基礎代謝が軽減される', () => {
    const active = computeEnergyCost(traits, 0, 1, false);
    const resting = computeEnergyCost(traits, 0, 1, true);

    expect(resting).toBeCloseTo(active * REST_METABOLISM_MULTIPLIER, 10);
    expect(resting).toBeLessThan(active);
  });

  it('休息中でも移動コストは軽減されない', () => {
    const movementOnly =
      computeEnergyCost(traits, 3, TIMESTEP, true) - computeEnergyCost(traits, 0, TIMESTEP, true);

    expect(movementOnly).toBeCloseTo(traits.movementCost * 3, 10);
  });

  it('コストが負にならない', () => {
    expect(computeEnergyCost(traits, 0, TIMESTEP, true)).toBeGreaterThan(0);
  });

  it('ステップ長に比例して基礎代謝が増える', () => {
    const single = computeEnergyCost(traits, 0, TIMESTEP, false);
    const double = computeEnergyCost(traits, 0, TIMESTEP * 2, false);

    expect(double).toBeCloseTo(single * 2, 10);
  });

  it('基礎代謝の高い個体ほど同じ条件で多く消費する', () => {
    const efficient = computeEnergyCost({ ...traits, basalMetabolism: 0.3 }, 1, TIMESTEP, false);
    const costly = computeEnergyCost({ ...traits, basalMetabolism: 0.8 }, 1, TIMESTEP, false);

    expect(costly).toBeGreaterThan(efficient);
  });

  it('移動単価の高い個体ほど同じ距離で多く消費する', () => {
    const light = computeEnergyCost({ ...traits, movementCost: 0.1 }, 2, TIMESTEP, false);
    const heavy = computeEnergyCost({ ...traits, movementCost: 0.4 }, 2, TIMESTEP, false);

    expect(heavy).toBeGreaterThan(light);
  });
});

describe('clampEnergy', () => {
  it('個体ごとの上限を超えない', () => {
    expect(clampEnergy(150, 100)).toBe(100);
    expect(clampEnergy(150, 120)).toBe(120);
  });

  it('負にならない', () => {
    expect(clampEnergy(-10, 100)).toBe(0);
  });

  it('範囲内はそのまま返す', () => {
    expect(clampEnergy(42, 100)).toBe(42);
  });
});

describe('isStarved', () => {
  it('0以下なら餓死', () => {
    expect(isStarved(0)).toBe(true);
    expect(isStarved(-1)).toBe(true);
  });

  it('残っていれば生存', () => {
    expect(isStarved(0.1)).toBe(false);
  });
});

describe('isTooOld', () => {
  it('寿命に達したら死亡', () => {
    expect(isTooOld(200, 200)).toBe(true);
    expect(isTooOld(201, 200)).toBe(true);
  });

  it('寿命前は生存', () => {
    expect(isTooOld(199, 200)).toBe(false);
  });
});
