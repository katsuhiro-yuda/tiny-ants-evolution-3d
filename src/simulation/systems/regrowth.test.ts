import { describe, expect, it } from 'vitest';
import { startRegrowthDelay, updateFoodRegrowth } from './regrowth';
import type { Food } from '../resources/food';
import { FOOD_REGROWTH_DELAY_SECONDS, FOOD_REGROWTH_DURATION_SECONDS } from '../config/resources';

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    id: 'food-test',
    position: { x: 0, y: 0, z: 0 },
    energy: 0,
    capacity: 30,
    regrowthDelayRemaining: 0,
    regrowthRate: 1,
    ...overrides,
  };
}

/** 指定秒数ぶん再生を進める。 */
function advance(foods: Food[], seconds: number, timestep = 1 / 60): void {
  const steps = Math.round(seconds / timestep);
  for (let i = 0; i < steps; i += 1) {
    updateFoodRegrowth(foods, timestep);
  }
}

describe('updateFoodRegrowth', () => {
  it('満量の餌は変化しない', () => {
    const food = makeFood({ energy: 30 });
    advance([food], 10);

    expect(food.energy).toBe(30);
  });

  it('待ち時間の間は回復しない', () => {
    const food = makeFood({ regrowthDelayRemaining: FOOD_REGROWTH_DELAY_SECONDS });
    advance([food], FOOD_REGROWTH_DELAY_SECONDS / 2);

    expect(food.energy).toBe(0);
  });

  it('待ち時間の経過後に回復が始まる', () => {
    const food = makeFood({ regrowthDelayRemaining: FOOD_REGROWTH_DELAY_SECONDS });
    advance([food], FOOD_REGROWTH_DELAY_SECONDS + 1);

    expect(food.energy).toBeGreaterThan(0);
  });

  it('再生時間の経過で満量まで戻る', () => {
    const food = makeFood();
    advance([food], FOOD_REGROWTH_DURATION_SECONDS + 1);

    expect(food.energy).toBeCloseTo(food.capacity, 6);
  });

  it('容量を超えて回復しない', () => {
    const food = makeFood();
    advance([food], FOOD_REGROWTH_DURATION_SECONDS * 5);

    expect(food.energy).toBe(food.capacity);
  });

  it('再生速度の倍率が大きいほど速く回復する', () => {
    const slow = makeFood({ regrowthRate: 1 });
    const fast = makeFood({ regrowthRate: 2.2 });
    advance([slow, fast], FOOD_REGROWTH_DURATION_SECONDS / 4);

    expect(fast.energy).toBeGreaterThan(slow.energy);
  });

  it('複数の餌を同時に扱える', () => {
    const foods = [makeFood({ id: 'a' }), makeFood({ id: 'b' })];
    advance(foods, FOOD_REGROWTH_DURATION_SECONDS + 1);

    expect(foods.every((food) => food.energy === food.capacity)).toBe(true);
  });
});

describe('startRegrowthDelay', () => {
  it('空になった餌へ待ち時間を設定する', () => {
    const food = makeFood({ energy: 0 });
    startRegrowthDelay(food);

    expect(food.regrowthDelayRemaining).toBe(FOOD_REGROWTH_DELAY_SECONDS);
  });

  it('残量がある餌には設定しない', () => {
    const food = makeFood({ energy: 5 });
    startRegrowthDelay(food);

    expect(food.regrowthDelayRemaining).toBe(0);
  });
});
