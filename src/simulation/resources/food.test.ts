import { describe, expect, it } from 'vitest';
import { consumeFood, isEdible, type Food } from './food';

function makeFood(energy: number, capacity = 30): Food {
  return {
    id: 'food-test',
    position: { x: 0, y: 0, z: 0 },
    energy,
    capacity,
    regrowthDelayRemaining: 0,
    regrowthRate: 1,
  };
}

describe('isEdible', () => {
  it('残量があれば食べられる', () => {
    expect(isEdible(makeFood(1))).toBe(true);
  });

  it('残量0なら食べられない', () => {
    expect(isEdible(makeFood(0))).toBe(false);
  });
});

describe('consumeFood', () => {
  it('要求量を取り出し残量を減らす', () => {
    const food = makeFood(30);

    expect(consumeFood(food, 10)).toBe(10);
    expect(food.energy).toBe(20);
  });

  it('残量を超えて取り出さない', () => {
    const food = makeFood(5);

    expect(consumeFood(food, 10)).toBe(5);
    expect(food.energy).toBe(0);
  });

  it('空の餌からは取り出せない', () => {
    const food = makeFood(0);

    expect(consumeFood(food, 10)).toBe(0);
    expect(food.energy).toBe(0);
  });

  it('0以下の要求では何も起きない', () => {
    const food = makeFood(30);

    expect(consumeFood(food, 0)).toBe(0);
    expect(consumeFood(food, -5)).toBe(0);
    expect(food.energy).toBe(30);
  });

  it('残量が負にならない', () => {
    const food = makeFood(3);
    consumeFood(food, 100);

    expect(food.energy).toBeGreaterThanOrEqual(0);
  });
});
