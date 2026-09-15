import type { Vec3 } from '../types';

/**
 * 静的な地形（仕様書 §4）。
 * 生成後は移動も消滅もしないため、グリッドではなく配列のまま保持する。
 */

export type TerrainKind = 'water' | 'rock';

export interface TerrainFeature {
  id: string;
  kind: TerrainKind;
  position: Vec3;
  /** XZ平面上の半径。判定は円で行う。 */
  radius: number;
}

/** 指定座標が地形の内側にあるか。 */
export function isInsideFeature(feature: TerrainFeature, x: number, z: number): boolean {
  const offsetX = x - feature.position.x;
  const offsetZ = z - feature.position.z;
  return offsetX * offsetX + offsetZ * offsetZ <= feature.radius * feature.radius;
}

/**
 * 指定座標が通行できないか。
 * 水場と岩はどちらも Phase 1 では侵入できない障害物として扱う。
 */
export function isBlocked(features: readonly TerrainFeature[], x: number, z: number): boolean {
  for (const feature of features) {
    if (isInsideFeature(feature, x, z)) {
      return true;
    }
  }
  return false;
}

/** 指定座標から最も近い水場までの距離。水場がなければ Infinity。 */
export function distanceToNearestWater(features: readonly TerrainFeature[], x: number, z: number) {
  let nearest = Number.POSITIVE_INFINITY;

  for (const feature of features) {
    if (feature.kind !== 'water') {
      continue;
    }
    const offsetX = x - feature.position.x;
    const offsetZ = z - feature.position.z;
    // 水場の縁からの距離を測る。内側なら0
    const distance = Math.max(0, Math.hypot(offsetX, offsetZ) - feature.radius);
    if (distance < nearest) {
      nearest = distance;
    }
  }

  return nearest;
}
