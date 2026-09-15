import { DIET_THRESHOLD, FEATURE_PERCENTILE, MAX_FEATURE_LABELS } from '../config/genetics';
import type { Genome } from './genome';

/**
 * 生態型ラベル（仕様書 §6「生態型」）。
 *
 * 食性は固定クラスとして持たず、消化形質の差から毎回計算する。
 * 特徴ラベルは現存個体との相対評価なので、集団の分布から閾値を作ってから判定する。
 */

/** 食性ラベル。個体は必ず1つだけ持つ。 */
export type DietType = 'herbivore' | 'carnivore' | 'omnivore';

/** 特徴ラベルの対象形質（仕様書 §6「速度、装甲、体格、視野、繁殖力」）。 */
export const FEATURE_TRAITS = [
  'speed',
  'armor',
  'bodySize',
  'visionRange',
  'fertility',
] as const satisfies readonly (keyof Genome)[];

export type FeatureTrait = (typeof FEATURE_TRAITS)[number];

/** 特徴ラベルの判定に使う、集団内の上位20%の境界値。 */
export type FeatureThresholds = Record<FeatureTrait, number>;

/**
 * 消化形質の差から食性を求める。
 * 差が閾値未満なら雑食。固定クラスを持たないため、変異で食性そのものが変わる。
 */
export function computeDiet(genome: Genome): DietType {
  const difference = genome.plantDigestion - genome.meatDigestion;

  if (difference >= DIET_THRESHOLD) {
    return 'herbivore';
  }
  if (-difference >= DIET_THRESHOLD) {
    return 'carnivore';
  }
  return 'omnivore';
}

/**
 * 現存個体から特徴ラベルの閾値（上位20%の境界値）を求める。
 *
 * 個体ごとに集団全体を走査すると O(n²) になるため、1回だけ計算して使い回す。
 * 個体がいない場合は誰もラベルを持たないよう、到達しない値を返す。
 */
export function computeFeatureThresholds(genomes: readonly Genome[]): FeatureThresholds {
  const thresholds = {} as FeatureThresholds;

  for (const trait of FEATURE_TRAITS) {
    if (genomes.length === 0) {
      thresholds[trait] = Number.POSITIVE_INFINITY;
      continue;
    }

    const values = genomes.map((genome) => genome[trait]).sort((a, b) => a - b);
    const index = Math.min(values.length - 1, Math.floor(values.length * FEATURE_PERCENTILE));
    thresholds[trait] = values[index];
  }

  return thresholds;
}

/**
 * 閾値を上回る形質を、超過幅の大きい順に最大2つ返す（仕様書 §6）。
 * 同率の場合は FEATURE_TRAITS の宣言順で安定させる。
 */
export function computeFeatureLabels(
  genome: Genome,
  thresholds: FeatureThresholds,
): FeatureTrait[] {
  const exceeded: { trait: FeatureTrait; margin: number }[] = [];

  for (const trait of FEATURE_TRAITS) {
    const threshold = thresholds[trait];
    if (Number.isFinite(threshold) && genome[trait] >= threshold) {
      exceeded.push({ trait, margin: genome[trait] - threshold });
    }
  }

  exceeded.sort((a, b) => b.margin - a.margin);

  return exceeded.slice(0, MAX_FEATURE_LABELS).map((entry) => entry.trait);
}
