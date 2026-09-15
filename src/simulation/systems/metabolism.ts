import {
  BASAL_METABOLISM_PER_SECOND,
  MAX_ENERGY,
  MOVEMENT_COST_PER_UNIT_DISTANCE,
  REST_METABOLISM_MULTIPLIER,
} from '../config/biology';

/**
 * エネルギー収支（仕様書 §6, §14 Phase 1）。
 *
 * 消費 = 基礎代謝 + 移動コスト。回復は採食のみ。
 * Phase 2 で metabolism / bodySize の係数が入るため、計算は純粋関数として分離する。
 */

/**
 * 1ステップあたりの消費エネルギーを求める。
 *
 * @param movedDistance そのステップで実際に移動した距離（ワールド単位）
 * @param timestepSeconds ステップ長（秒）
 * @param isResting 休息中なら基礎代謝が軽減される
 */
export function computeEnergyCost(
  movedDistance: number,
  timestepSeconds: number,
  isResting: boolean,
): number {
  const basalMultiplier = isResting ? REST_METABOLISM_MULTIPLIER : 1;
  const basal = BASAL_METABOLISM_PER_SECOND * basalMultiplier * timestepSeconds;
  const movement = MOVEMENT_COST_PER_UNIT_DISTANCE * movedDistance;

  return basal + movement;
}

/** エネルギーを上限と下限で丸める。 */
export function clampEnergy(energy: number): number {
  if (energy < 0) {
    return 0;
  }
  return energy > MAX_ENERGY ? MAX_ENERGY : energy;
}

/** エネルギーが尽きたか。 */
export function isStarved(energy: number): boolean {
  return energy <= 0;
}

/** 寿命を超えたか。 */
export function isTooOld(ageSeconds: number, lifespanSeconds: number): boolean {
  return ageSeconds >= lifespanSeconds;
}
