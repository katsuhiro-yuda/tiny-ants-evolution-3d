import { describe, expect, it } from 'vitest';
import { createRandom, hashSeed } from './random';

describe('createRandom', () => {
  it('同一シードから同一の列を返す', () => {
    const a = createRandom('tiny-ants');
    const b = createRandom('tiny-ants');
    const seriesA = Array.from({ length: 100 }, () => a.next());
    const seriesB = Array.from({ length: 100 }, () => b.next());

    expect(seriesA).toEqual(seriesB);
  });

  it('異なるシードでは異なる列を返す', () => {
    const a = createRandom('tiny-ants');
    const b = createRandom('tiny-ants-2');

    expect(Array.from({ length: 20 }, () => a.next())).not.toEqual(
      Array.from({ length: 20 }, () => b.next()),
    );
  });

  it('数値シードと文字列シードのどちらも受け付ける', () => {
    const numeric = createRandom(12345);
    const fromHash = createRandom(hashSeed('tiny-ants'));

    expect(numeric.next()).toBeGreaterThanOrEqual(0);
    expect(fromHash.next()).toBeGreaterThanOrEqual(0);
    expect(createRandom(hashSeed('tiny-ants')).next()).toBe(createRandom('tiny-ants').next());
  });

  it('next() は 0以上1未満を返す', () => {
    const random = createRandom('range-check');
    for (let i = 0; i < 10000; i += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('range() は指定範囲へ収まる', () => {
    const random = createRandom('range');
    for (let i = 0; i < 1000; i += 1) {
      const value = random.range(-50, 50);
      expect(value).toBeGreaterThanOrEqual(-50);
      expect(value).toBeLessThan(50);
    }
  });

  it('int() は両端を含む整数を返す', () => {
    const random = createRandom('int');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = random.int(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect(seen.size).toBe(6);
  });

  it('生成器同士は独立している', () => {
    const a = createRandom('independent');
    const b = createRandom('independent');
    a.next();
    a.next();

    // b は a の消費に影響されない
    expect(b.next()).toBe(createRandom('independent').next());
  });

  it('分布が一様に近い（10区間の偏りが許容範囲内）', () => {
    const random = createRandom('uniformity');
    const buckets = new Array<number>(10).fill(0);
    const samples = 100000;

    for (let i = 0; i < samples; i += 1) {
      buckets[Math.floor(random.next() * 10)] += 1;
    }

    const expected = samples / 10;
    for (const count of buckets) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });

  it('getState() で進行状態が変化する', () => {
    const random = createRandom('state');
    const before = random.getState();
    random.next();

    expect(random.getState()).not.toBe(before);
  });
});

describe('hashSeed', () => {
  it('同一文字列から同一の値を返す', () => {
    expect(hashSeed('tiny-ants')).toBe(hashSeed('tiny-ants'));
  });

  it('32bit符号なし整数を返す', () => {
    for (const seed of ['', 'a', 'tiny-ants', '日本語シード']) {
      const value = hashSeed(seed);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
