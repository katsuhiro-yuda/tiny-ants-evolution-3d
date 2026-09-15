import { FOOD_REGROWTH_DELAY_SECONDS, FOOD_REGROWTH_DURATION_SECONDS } from '../config/resources';
import type { Food } from '../resources/food';

/**
 * 植物性餌の再生（仕様書 §4「周辺条件と時間で再生」）。
 *
 * 空になった餌は待ち時間を経てから、水場の近さに応じた速度で回復する。
 * `regrowthRate` は世界生成時に地形から算出済みで、ここでは参照するだけ。
 */
export function updateFoodRegrowth(foods: readonly Food[], timestepSeconds: number): void {
  for (const food of foods) {
    if (food.energy >= food.capacity) {
      continue;
    }

    if (food.regrowthDelayRemaining > 0) {
      food.regrowthDelayRemaining -= timestepSeconds;
      continue;
    }

    const recoveryPerSecond = (food.capacity / FOOD_REGROWTH_DURATION_SECONDS) * food.regrowthRate;
    food.energy = Math.min(food.capacity, food.energy + recoveryPerSecond * timestepSeconds);
  }
}

/**
 * 餌が食べ尽くされたときに再生待ちへ移す。
 * 採食システムから呼ぶ。
 */
export function startRegrowthDelay(food: Food): void {
  if (food.energy <= 0) {
    food.regrowthDelayRemaining = FOOD_REGROWTH_DELAY_SECONDS;
  }
}
