import { MAJOR_MUTATION_CHANCE, MAJOR_MUTATION_STEP, MUTATION_STEP } from '../config/genetics';
import type { Random } from '../types';
import { clampGene, GENOME_KEYS, type Genome } from './genome';

/**
 * 遺伝と突然変異（仕様書 §6「遺伝」）。
 *
 * MVPでは親1個体から子を生成する。子は全形質を継承し、各形質へ平均0の小さな変異が入る。
 * 低確率で通常より大きな変異が起き、値はすべて 0.0〜1.0 に収まる。
 */

/**
 * 1つの形質を継承する。
 *
 * 乱数の消費回数を分岐で変えない（常に3回）。分岐ごとに消費数が変わると、
 * ある形質の変異の有無が後続の形質の変異へ波及し、変異を独立に検証できなくなる。
 */
export function inheritGene(value: number, random: Random): number {
  const roll = random.next();
  // 2つの一様乱数の平均から作る三角分布。平均0で、小さな変異ほど起きやすい
  const centered = (random.next() + random.next()) / 2 - 0.5;

  const step = roll < MAJOR_MUTATION_CHANCE ? MAJOR_MUTATION_STEP : MUTATION_STEP;

  return clampGene(value + centered * 2 * step);
}

/** 親の Genome から子の Genome を作る。 */
export function inheritGenome(parent: Genome, random: Random): Genome {
  const child = {} as Genome;

  for (const key of GENOME_KEYS) {
    child[key] = inheritGene(parent[key], random);
  }

  return child;
}

/** 2つの Genome の形質ごとの差の合計。変異量の検証と系統の比較に使う。 */
export function genomeDistance(a: Genome, b: Genome): number {
  let total = 0;
  for (const key of GENOME_KEYS) {
    total += Math.abs(a[key] - b[key]);
  }
  return total;
}
