import type { Random } from '../types';

/**
 * シード付き乱数生成器（mulberry32）。
 *
 * 同一シードから常に同一の列を返す。世界生成・変異・行動のゆらぎは
 * すべてこの生成器を経由させ、`Math.random` を直接使わないこと（仕様書 §12）。
 */

/** 文字列シードを32bit整数へ変換する（FNV-1a）。 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    // FNV素数 16777619 の乗算を32bitで行う
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * 乱数生成器を生成する。
 *
 * @param seed 数値シード、または文字列シード（内部で32bit整数へ変換する）
 */
export function createRandom(seed: number | string): Random {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min: number, max: number): number => min + next() * (max - min),
    int: (min: number, max: number): number => min + Math.floor(next() * (max - min + 1)),
    getState: (): number => state,
  };
}
