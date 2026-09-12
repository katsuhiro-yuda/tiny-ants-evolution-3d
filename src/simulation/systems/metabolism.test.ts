import { describe, expect, it } from 'vitest';
import { clampEnergy, computeEnergyCost, isStarved, isTooOld } from './metabolism';
import {
  BASAL_METABOLISM_PER_SECOND,
  MAX_ENERGY,
  MOVEMENT_COST_PER_UNIT_DISTANCE,
  REST_METABOLISM_MULTIPLIER,
} from '../config/biology';

const TIMESTEP = 1 / 60;

describe('computeEnergyCost', () => {
  it('静止していても基礎代謝を消費する', () => {
    expect(computeEnergyCost(0, 1, false)).toBeCloseTo(BASAL_METABOLISM_PER_SECOND, 10);
  });

  it('移動距離に比例してコストが増える', () => {
    const short = computeEnergyCost(1, TIMESTEP, false);
    const long = computeEnergyCost(2, TIMESTEP, false);

    expect(long - short).toBeCloseTo(MOVEMENT_COST_PER_UNIT_DISTANCE, 10);
  });

  it('休息中は基礎代謝が軽減される', () => {
    const active = computeEnergyCost(0, 1, false);
    const resting = computeEnergyCost(0, 1, true);

    expect(resting).toBeCloseTo(active * REST_METABOLISM_MULTIPLIER, 10);
    expect(resting).toBeLessThan(active);
  });

  it('休息中でも移動コストは軽減されない', () => {
    const movementOnly =
      computeEnergyCost(3, TIMESTEP, true) - computeEnergyCost(0, TIMESTEP, true);

    expect(movementOnly).toBeCloseTo(MOVEMENT_COST_PER_UNIT_DISTANCE * 3, 10);
  });

  it('コストが負にならない', () => {
    expect(computeEnergyCost(0, TIMESTEP, true)).toBeGreaterThan(0);
  });

  it('ステップ長に比例して基礎代謝が増える', () => {
    const single = computeEnergyCost(0, TIMESTEP, false);
    const double = computeEnergyCost(0, TIMESTEP * 2, false);

    expect(double).toBeCloseTo(single * 2, 10);
  });

  it('高速移動のほうが単位時間あたりのコストが高い（仕様書 §6 のトレードオフ）', () => {
    const slow = computeEnergyCost(1 * TIMESTEP, TIMESTEP, false);
    const fast = computeEnergyCost(3 * TIMESTEP, TIMESTEP, false);

    expect(fast).toBeGreaterThan(slow);
  });
});

describe('clampEnergy', () => {
  it('上限を超えない', () => {
    expect(clampEnergy(MAX_ENERGY + 50)).toBe(MAX_ENERGY);
  });

  it('負にならない', () => {
    expect(clampEnergy(-10)).toBe(0);
  });

  it('範囲内はそのまま返す', () => {
    expect(clampEnergy(42)).toBe(42);
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
