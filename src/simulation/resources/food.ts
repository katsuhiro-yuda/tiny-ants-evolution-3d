import type { Vec3 } from '../types';

/**
 * 植物性餌（仕様書 §4）。
 *
 * 食べ尽くされても消滅させず、再生待ちの状態で同じ場所に残す。
 * 配列の増減が起きないため、グリッド再構築と描画インスタンスの管理が単純になる。
 */
export interface Food {
  id: string;
  position: Vec3;
  /** 残りエネルギー。0なら再生待ち。 */
  energy: number;
  /** 満量時のエネルギー。再生の上限になる。 */
  capacity: number;
  /** 再生が始まるまでの残り時間（秒）。 */
  regrowthDelayRemaining: number;
  /** 1秒あたりの再生速度の倍率。水場が近いほど大きい。 */
  regrowthRate: number;
}

/** 食べられる状態か。 */
export function isEdible(food: Food): boolean {
  return food.energy > 0;
}

/**
 * 餌からエネルギーを取り出す。
 * 残量を超えて取り出すことはなく、実際に取り出せた量を返す。
 */
export function consumeFood(food: Food, requested: number): number {
  if (requested <= 0 || food.energy <= 0) {
    return 0;
  }

  const taken = Math.min(requested, food.energy);
  food.energy -= taken;
  return taken;
}
