import { describe, expect, it } from 'vitest';
import {
  computeDiet,
  computeFeatureLabels,
  computeFeatureThresholds,
  FEATURE_TRAITS,
} from './ecotype';
import { DIET_THRESHOLD, MAX_FEATURE_LABELS } from '../config/genetics';
import { uniformGenome } from '../../test/antFactory';
import type { Genome } from './genome';

function digestion(plant: number, meat: number): Genome {
  return { ...uniformGenome(0.5), plantDigestion: plant, meatDigestion: meat };
}

describe('computeDiet', () => {
  it('植物消化が閾値以上に勝れば草食型（仕様書 §6）', () => {
    expect(computeDiet(digestion(0.5 + DIET_THRESHOLD, 0.5))).toBe('herbivore');
    expect(computeDiet(digestion(0.9, 0.1))).toBe('herbivore');
  });

  it('肉消化が閾値以上に勝れば肉食型', () => {
    expect(computeDiet(digestion(0.5, 0.5 + DIET_THRESHOLD))).toBe('carnivore');
    expect(computeDiet(digestion(0.1, 0.9))).toBe('carnivore');
  });

  it('差が閾値未満なら雑食型', () => {
    expect(computeDiet(digestion(0.5, 0.5))).toBe('omnivore');
    expect(computeDiet(digestion(0.5 + DIET_THRESHOLD * 0.9, 0.5))).toBe('omnivore');
  });

  it('両方が高くても差がなければ雑食型（固定クラスではない）', () => {
    expect(computeDiet(digestion(1, 1))).toBe('omnivore');
    expect(computeDiet(digestion(0, 0))).toBe('omnivore');
  });

  it('消化形質以外は食性に影響しない', () => {
    const base = digestion(0.9, 0.1);

    expect(computeDiet({ ...base, attack: 1, bodySize: 1 })).toBe('herbivore');
  });
});

describe('computeFeatureThresholds', () => {
  it('個体がいなければ誰もラベルを持たない', () => {
    const thresholds = computeFeatureThresholds([]);

    for (const trait of FEATURE_TRAITS) {
      expect(Number.isFinite(thresholds[trait])).toBe(false);
    }
    expect(computeFeatureLabels(uniformGenome(1), thresholds)).toEqual([]);
  });

  it('上位20%の境界を返す', () => {
    // speed が 0.0, 0.1, ..., 0.9 の10個体。上位20%の境界は0.8
    const genomes = Array.from({ length: 10 }, (_, index) => ({
      ...uniformGenome(0.5),
      speed: index / 10,
    }));

    expect(computeFeatureThresholds(genomes).speed).toBeCloseTo(0.8, 10);
  });

  it('形質ごとに独立して求める', () => {
    const genomes = [
      { ...uniformGenome(0.5), speed: 0.9, armor: 0.1 },
      { ...uniformGenome(0.5), speed: 0.1, armor: 0.9 },
    ];
    const thresholds = computeFeatureThresholds(genomes);

    expect(thresholds.speed).toBe(0.9);
    expect(thresholds.armor).toBe(0.9);
  });
});

describe('computeFeatureLabels', () => {
  // 特徴ラベルの対象形質すべてを散らす。一部でも全員同値だと、その形質は全員が境界値以上になる
  const population = Array.from({ length: 10 }, (_, index) => {
    const genome = uniformGenome(0.5);
    for (const trait of FEATURE_TRAITS) {
      genome[trait] = index / 10;
    }
    return genome;
  });
  const thresholds = computeFeatureThresholds(population);

  it('閾値を超えた形質にラベルが付く', () => {
    const fast = { ...uniformGenome(0.5), speed: 1 };

    expect(computeFeatureLabels(fast, thresholds)).toContain('speed');
  });

  it('平均的な個体にはラベルが付かない', () => {
    expect(computeFeatureLabels(uniformGenome(0.5), thresholds)).toEqual([]);
  });

  it('ラベルは最大2つまで（仕様書 §6）', () => {
    const labels = computeFeatureLabels(uniformGenome(1), thresholds);

    expect(labels.length).toBeLessThanOrEqual(MAX_FEATURE_LABELS);
  });

  it('超過幅の大きい形質を優先する', () => {
    const genome = { ...uniformGenome(0.5), speed: 0.85, armor: 1, bodySize: 0.9 };
    const labels = computeFeatureLabels(genome, thresholds);

    expect(labels[0]).toBe('armor');
  });

  it('同じ形質の集団では全員がラベルを持ちうる（境界値も含む）', () => {
    const uniform = Array.from({ length: 5 }, () => uniformGenome(0.5));
    const uniformThresholds = computeFeatureThresholds(uniform);

    expect(computeFeatureLabels(uniformGenome(0.5), uniformThresholds).length).toBeGreaterThan(0);
  });
});
