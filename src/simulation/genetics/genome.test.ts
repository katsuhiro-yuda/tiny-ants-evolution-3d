import { describe, expect, it } from 'vitest';
import {
  clampGene,
  clampGenome,
  createInitialGenome,
  GENE_MAX,
  GENE_MIN,
  GENOME_KEYS,
} from './genome';
import { createRandom } from '../engine/random';
import { INITIAL_GENE_MEAN, INITIAL_GENE_SPREAD } from '../config/genetics';
import { uniformGenome } from '../../test/antFactory';

describe('GENOME_KEYS', () => {
  it('仕様書 §5 の14形質をすべて含む', () => {
    expect(GENOME_KEYS).toHaveLength(14);
    expect(new Set(GENOME_KEYS).size).toBe(14);
  });
});

describe('clampGene', () => {
  it('値域内はそのまま返す', () => {
    expect(clampGene(0.42)).toBe(0.42);
    expect(clampGene(GENE_MIN)).toBe(GENE_MIN);
    expect(clampGene(GENE_MAX)).toBe(GENE_MAX);
  });

  it('値域外を 0.0〜1.0 に収める（仕様書 §6）', () => {
    expect(clampGene(1.8)).toBe(GENE_MAX);
    expect(clampGene(-0.5)).toBe(GENE_MIN);
  });

  it('NaN と Infinity は中立値へ倒す', () => {
    expect(clampGene(Number.NaN)).toBe(INITIAL_GENE_MEAN);
    expect(clampGene(Number.POSITIVE_INFINITY)).toBe(INITIAL_GENE_MEAN);
    expect(clampGene(Number.NEGATIVE_INFINITY)).toBe(INITIAL_GENE_MEAN);
  });
});

describe('clampGenome', () => {
  it('全形質を値域へ収める', () => {
    const broken = { ...uniformGenome(0.5), speed: 3, armor: -2 };
    const clamped = clampGenome(broken);

    expect(clamped.speed).toBe(GENE_MAX);
    expect(clamped.armor).toBe(GENE_MIN);
    expect(clamped.bodySize).toBe(0.5);
  });

  it('入力を書き換えない', () => {
    const original = { ...uniformGenome(0.5), speed: 3 };
    clampGenome(original);

    expect(original.speed).toBe(3);
  });
});

describe('createInitialGenome', () => {
  it('全形質が値域に収まる', () => {
    const genome = createInitialGenome(createRandom('initial'));

    for (const key of GENOME_KEYS) {
      expect(genome[key]).toBeGreaterThanOrEqual(GENE_MIN);
      expect(genome[key]).toBeLessThanOrEqual(GENE_MAX);
    }
  });

  it('同一シードから同一の形質を作る（決定性）', () => {
    expect(createInitialGenome(createRandom('same'))).toEqual(
      createInitialGenome(createRandom('same')),
    );
  });

  it('個体ごとに形質が異なる', () => {
    const random = createRandom('varied');
    const first = createInitialGenome(random);
    const second = createInitialGenome(random);

    expect(first).not.toEqual(second);
  });

  it('設定した範囲を超えて散らばらない', () => {
    const random = createRandom('spread');

    for (let i = 0; i < 200; i += 1) {
      const genome = createInitialGenome(random);

      for (const key of GENOME_KEYS) {
        expect(Math.abs(genome[key] - INITIAL_GENE_MEAN)).toBeLessThanOrEqual(INITIAL_GENE_SPREAD);
      }
    }
  });

  it('平均が中心値付近に収まる', () => {
    const random = createRandom('mean');
    let total = 0;
    const samples = 400;

    for (let i = 0; i < samples; i += 1) {
      total += createInitialGenome(random).speed;
    }

    expect(total / samples).toBeCloseTo(INITIAL_GENE_MEAN, 1);
  });
});
