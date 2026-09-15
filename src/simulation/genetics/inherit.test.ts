import { describe, expect, it } from 'vitest';
import { genomeDistance, inheritGene, inheritGenome } from './inherit';
import { GENE_MAX, GENE_MIN, GENOME_KEYS } from './genome';
import { createRandom } from '../engine/random';
import { MAJOR_MUTATION_STEP, MUTATION_STEP } from '../config/genetics';
import { uniformGenome } from '../../test/antFactory';

/** 変異の統計を見るため、同じ親から多数の子を作る。 */
function sampleGenes(value: number, count: number, seed = 'mutation'): number[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => inheritGene(value, random));
}

describe('inheritGene', () => {
  it('変異は平均0（親の値の周りに散る）', () => {
    const samples = sampleGenes(0.5, 2000);
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;

    expect(mean).toBeCloseTo(0.5, 2);
  });

  it('ほとんどの変異は小さい', () => {
    const samples = sampleGenes(0.5, 2000);
    const small = samples.filter((value) => Math.abs(value - 0.5) <= MUTATION_STEP);

    // 大変異は低確率なので、大半が通常の変異幅に収まる
    expect(small.length / samples.length).toBeGreaterThan(0.9);
  });

  it('低確率で通常より大きな変異が起きる（仕様書 §6）', () => {
    const samples = sampleGenes(0.5, 2000);
    const major = samples.filter((value) => Math.abs(value - 0.5) > MUTATION_STEP);

    expect(major.length).toBeGreaterThan(0);
    expect(Math.max(...samples) - 0.5).toBeGreaterThan(MUTATION_STEP);
  });

  it('大変異でも変異幅の上限を超えない', () => {
    const samples = sampleGenes(0.5, 2000);

    for (const value of samples) {
      expect(Math.abs(value - 0.5)).toBeLessThanOrEqual(MAJOR_MUTATION_STEP);
    }
  });

  it('値域の端でも 0.0〜1.0 に収まる（仕様書 §6）', () => {
    for (const parentValue of [GENE_MIN, GENE_MAX]) {
      for (const value of sampleGenes(parentValue, 500)) {
        expect(value).toBeGreaterThanOrEqual(GENE_MIN);
        expect(value).toBeLessThanOrEqual(GENE_MAX);
      }
    }
  });

  it('乱数の消費回数が親の値によらず一定', () => {
    // 消費回数が変わると、ある形質の変異が後続の形質へ波及してしまう
    const a = createRandom('consumption');
    inheritGene(0, a);
    const afterLow = a.getState();

    const b = createRandom('consumption');
    inheritGene(1, b);
    const afterHigh = b.getState();

    expect(afterLow).toBe(afterHigh);
  });
});

describe('inheritGenome', () => {
  it('全形質を継承する（親から大きく離れない）', () => {
    const parent = uniformGenome(0.5);
    const child = inheritGenome(parent, createRandom('child'));

    for (const key of GENOME_KEYS) {
      expect(Math.abs(child[key] - parent[key])).toBeLessThanOrEqual(MAJOR_MUTATION_STEP);
    }
  });

  it('子は親と完全には一致しない（変異が入る）', () => {
    const parent = uniformGenome(0.5);

    expect(inheritGenome(parent, createRandom('vary'))).not.toEqual(parent);
  });

  it('同一シードから同一の子になる（決定性）', () => {
    const parent = uniformGenome(0.42);

    expect(inheritGenome(parent, createRandom('same'))).toEqual(
      inheritGenome(parent, createRandom('same')),
    );
  });

  it('親を書き換えない', () => {
    const parent = uniformGenome(0.5);
    inheritGenome(parent, createRandom('immutable'));

    expect(parent).toEqual(uniformGenome(0.5));
  });

  it('世代を重ねても値域を外れない', () => {
    const random = createRandom('generations');
    let genome = uniformGenome(0.95);

    for (let generation = 0; generation < 200; generation += 1) {
      genome = inheritGenome(genome, random);

      for (const key of GENOME_KEYS) {
        expect(genome[key]).toBeGreaterThanOrEqual(GENE_MIN);
        expect(genome[key]).toBeLessThanOrEqual(GENE_MAX);
      }
    }
  });

  it('世代を重ねると形質が親世代から離れていく', () => {
    const random = createRandom('drift');
    const ancestor = uniformGenome(0.5);
    let genome = ancestor;

    for (let generation = 0; generation < 50; generation += 1) {
      genome = inheritGenome(genome, random);
    }

    expect(genomeDistance(ancestor, genome)).toBeGreaterThan(0);
  });
});

describe('genomeDistance', () => {
  it('同一の形質なら0', () => {
    expect(genomeDistance(uniformGenome(0.5), uniformGenome(0.5))).toBe(0);
  });

  it('差が大きいほど値が大きい', () => {
    const near = genomeDistance(uniformGenome(0.5), uniformGenome(0.6));
    const far = genomeDistance(uniformGenome(0.5), uniformGenome(0.9));

    expect(far).toBeGreaterThan(near);
  });
});
