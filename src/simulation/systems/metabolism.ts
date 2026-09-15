import { REST_METABOLISM_MULTIPLIER } from '../config/biology';
import type { DerivedTraits } from '../genetics/traits';

/**
 * エネルギー収支（仕様書 §6, §14 Phase 1-2）。
 *
 * 消費 = 基礎代謝 + 移動コスト。回復は採食のみ。
 * 基礎代謝と移動単価は個体の形質で変わるため、能力値を受け取って計算する。
 */

/** 消費の計算に必要な能力値だけを受け取る。 */
export type MetabolicTraits = Pick<DerivedTraits, 'basalMetabolism' | 'movementCost'>;

/**
 * 1ステップあたりの消費エネルギーを求める。
 *
 * @param traits 個体の基礎代謝と移動単価
 * @param movedDistance そのステップで実際に移動した距離（ワールド単位）
 * @param timestepSeconds ステップ長（秒）
 * @param isResting 休息中なら基礎代謝が軽減される
 */
export function computeEnergyCost(
  traits: MetabolicTraits,
  movedDistance: number,
  timestepSeconds: number,
  isResting: boolean,
): number {
  const basalMultiplier = isResting ? REST_METABOLISM_MULTIPLIER : 1;
  const basal = traits.basalMetabolism * basalMultiplier * timestepSeconds;
  const movement = traits.movementCost * movedDistance;

  return basal + movement;
}

/** エネルギーを0と個体の上限で丸める。 */
export function clampEnergy(energy: number, capacity: number): number {
  if (energy < 0) {
    return 0;
  }
  return energy > capacity ? capacity : energy;
}

/** エネルギーが尽きたか。 */
export function isStarved(energy: number): boolean {
  return energy <= 0;
}

/** 寿命を超えたか。 */
export function isTooOld(ageSeconds: number, lifespanSeconds: number): boolean {
  return ageSeconds >= lifespanSeconds;
}
