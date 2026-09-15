import { describe, expect, it } from 'vitest';
import { distanceToNearestWater, isBlocked, isInsideFeature, type TerrainFeature } from './terrain';

function feature(
  kind: TerrainFeature['kind'],
  x: number,
  z: number,
  radius: number,
): TerrainFeature {
  return { id: `${kind}-${x}-${z}`, kind, position: { x, y: 0, z }, radius };
}

describe('isInsideFeature', () => {
  it('中心は内側', () => {
    expect(isInsideFeature(feature('rock', 0, 0, 5), 0, 0)).toBe(true);
  });

  it('半径ちょうどは内側に含む', () => {
    expect(isInsideFeature(feature('rock', 0, 0, 5), 5, 0)).toBe(true);
  });

  it('半径の外は含まない', () => {
    expect(isInsideFeature(feature('rock', 0, 0, 5), 5.1, 0)).toBe(false);
  });

  it('中心がずれていても判定できる', () => {
    const rock = feature('rock', 10, -10, 3);

    expect(isInsideFeature(rock, 11, -10)).toBe(true);
    expect(isInsideFeature(rock, 14.1, -10)).toBe(false);
  });
});

describe('isBlocked', () => {
  const terrain = [feature('water', 0, 0, 5), feature('rock', 20, 20, 2)];

  it('水場の内側は通行できない', () => {
    expect(isBlocked(terrain, 1, 1)).toBe(true);
  });

  it('岩の内側は通行できない', () => {
    expect(isBlocked(terrain, 20, 21)).toBe(true);
  });

  it('どの地形にも属さない場所は通行できる', () => {
    expect(isBlocked(terrain, 50, 50)).toBe(false);
  });

  it('地形がなければ常に通行できる', () => {
    expect(isBlocked([], 0, 0)).toBe(false);
  });
});

describe('distanceToNearestWater', () => {
  it('水場の縁からの距離を返す', () => {
    const terrain = [feature('water', 0, 0, 5)];

    expect(distanceToNearestWater(terrain, 15, 0)).toBeCloseTo(10, 10);
  });

  it('水場の内側は0', () => {
    const terrain = [feature('water', 0, 0, 5)];

    expect(distanceToNearestWater(terrain, 2, 0)).toBe(0);
  });

  it('最も近い水場を選ぶ', () => {
    const terrain = [feature('water', 0, 0, 2), feature('water', 100, 0, 2)];

    expect(distanceToNearestWater(terrain, 90, 0)).toBeCloseTo(8, 10);
  });

  it('岩は無視する', () => {
    const terrain = [feature('rock', 0, 0, 5)];

    expect(distanceToNearestWater(terrain, 10, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('水場がなければ Infinity', () => {
    expect(distanceToNearestWater([], 0, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});
