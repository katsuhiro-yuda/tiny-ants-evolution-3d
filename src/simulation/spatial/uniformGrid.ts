import type { Vec3 } from '../types';

/**
 * Uniform Grid による近傍探索（仕様書 §12「全個体同士の総当たりは禁止する」）。
 *
 * セルサイズを想定最大視界に合わせることで、近傍探索が常に3×3セルで完結する。
 * 毎ステップ再構築する前提の設計。数百個体規模では差分更新より単純で速く、
 * 位置ずれによる不整合も起きない。
 */

/** グリッドへ登録できる要素の最小要件。 */
export interface GridItem {
  position: Vec3;
}

export interface UniformGrid<T extends GridItem> {
  readonly cellSize: number;
  /** 登録済みの要素数。 */
  readonly size: number;
  /** 全要素を登録し直す。 */
  rebuild: (items: readonly T[]) => void;
  /**
   * 指定座標から半径 `radius` 以内にある要素を返す。
   *
   * `radius` がセルサイズを超える場合は探索するセル範囲を自動的に広げる。
   * 距離判定は呼び出し側ではなくここで行うため、返る要素は必ず半径内にある。
   */
  queryRadius: (center: Vec3, radius: number, out?: T[]) => T[];
  /**
   * 半径内で最も近い要素を1つ返す。該当がなければ undefined。
   * 配列を確保しないため、毎ステップの探索に向く。
   */
  findNearest: (center: Vec3, radius: number, predicate?: (item: T) => boolean) => T | undefined;
  clear: () => void;
}

/** セル座標を1つの整数キーへ畳み込む。 */
function cellKey(cellX: number, cellZ: number): number {
  // 32bit整数へ収めるため、各軸を16bitに制限する。
  // フィールドは有限なので、実際のセル数がこの範囲を超えることはない。
  return ((cellX & 0xffff) << 16) | (cellZ & 0xffff);
}

export function createUniformGrid<T extends GridItem>(cellSize: number): UniformGrid<T> {
  if (cellSize <= 0) {
    throw new Error('cellSize は正の数である必要があります。');
  }

  const cells = new Map<number, T[]>();
  let itemCount = 0;

  const toCell = (value: number): number => Math.floor(value / cellSize);

  return {
    cellSize,

    get size(): number {
      return itemCount;
    },

    rebuild(items: readonly T[]): void {
      // Map自体は再利用し、配列の再確保を避ける
      for (const bucket of cells.values()) {
        bucket.length = 0;
      }

      for (const item of items) {
        const key = cellKey(toCell(item.position.x), toCell(item.position.z));
        const bucket = cells.get(key);
        if (bucket) {
          bucket.push(item);
        } else {
          cells.set(key, [item]);
        }
      }

      itemCount = items.length;
    },

    queryRadius(center: Vec3, radius: number, out: T[] = []): T[] {
      out.length = 0;
      if (radius <= 0) {
        return out;
      }

      const radiusSquared = radius * radius;
      const span = Math.ceil(radius / cellSize);
      const centerCellX = toCell(center.x);
      const centerCellZ = toCell(center.z);

      for (let dx = -span; dx <= span; dx += 1) {
        for (let dz = -span; dz <= span; dz += 1) {
          const bucket = cells.get(cellKey(centerCellX + dx, centerCellZ + dz));
          if (!bucket) {
            continue;
          }

          for (const item of bucket) {
            const offsetX = item.position.x - center.x;
            const offsetZ = item.position.z - center.z;
            if (offsetX * offsetX + offsetZ * offsetZ <= radiusSquared) {
              out.push(item);
            }
          }
        }
      }

      return out;
    },

    findNearest(center: Vec3, radius: number, predicate?: (item: T) => boolean): T | undefined {
      if (radius <= 0) {
        return undefined;
      }

      const span = Math.ceil(radius / cellSize);
      const centerCellX = toCell(center.x);
      const centerCellZ = toCell(center.z);

      let nearest: T | undefined;
      let nearestDistanceSquared = radius * radius;

      for (let dx = -span; dx <= span; dx += 1) {
        for (let dz = -span; dz <= span; dz += 1) {
          const bucket = cells.get(cellKey(centerCellX + dx, centerCellZ + dz));
          if (!bucket) {
            continue;
          }

          for (const item of bucket) {
            if (predicate && !predicate(item)) {
              continue;
            }

            const offsetX = item.position.x - center.x;
            const offsetZ = item.position.z - center.z;
            const distanceSquared = offsetX * offsetX + offsetZ * offsetZ;

            if (distanceSquared <= nearestDistanceSquared) {
              nearestDistanceSquared = distanceSquared;
              nearest = item;
            }
          }
        }
      }

      return nearest;
    },

    clear(): void {
      cells.clear();
      itemCount = 0;
    },
  };
}
