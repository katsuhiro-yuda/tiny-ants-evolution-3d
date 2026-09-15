import { describe, expect, it } from 'vitest';
import { createStatsHistory, TRACKED_TRAITS } from './statsHistory';
import { GENOME_KEYS, type GenomeKey } from '../simulation/genetics/genome';
import type { WorldStats } from '../simulation/queries/worldStats';

function traitRecord(value: number): Record<GenomeKey, number> {
  const record = {} as Record<GenomeKey, number>;
  for (const key of GENOME_KEYS) {
    record[key] = value;
  }
  return record;
}

function stats(elapsedSeconds: number, population = 10, speed = 0.5): WorldStats {
  return {
    population,
    deathCount: 0,
    birthCount: 0,
    elapsedSeconds,
    averageEnergyRatio: 0.5,
    behaviorCounts: { Explore: population, SeekFood: 0, Eat: 0, Rest: 0, Reproduce: 0 },
    edibleFoodCount: 0,
    maxGeneration: 3,
    averageGeneration: 1,
    dietCounts: { herbivore: 0, carnivore: 0, omnivore: population },
    traitMeans: { ...traitRecord(0.5), speed },
    traitDeviations: traitRecord(0.1),
    featureThresholds: { speed: 1, armor: 1, bodySize: 1, visionRange: 1, fertility: 1 },
  };
}

describe('createStatsHistory', () => {
  it('最初の統計を記録する', () => {
    const history = createStatsHistory(10, 5);

    expect(history.record(stats(0))).toBe(true);
    expect(history.samples()).toHaveLength(1);
  });

  it('間隔が空くまでは記録しない', () => {
    const history = createStatsHistory(10, 5);
    history.record(stats(0));

    expect(history.record(stats(3))).toBe(false);
    expect(history.record(stats(5))).toBe(true);
    expect(history.samples()).toHaveLength(2);
  });

  it('シミュレーション時間を基準にする（実時間ではない）', () => {
    const history = createStatsHistory(10, 5);
    history.record(stats(0));
    history.record(stats(100));

    expect(history.samples().map((sample) => sample.elapsedSeconds)).toEqual([0, 100]);
  });

  it('上限を超えてもサンプル数が増えない（仕様書 §10）', () => {
    const history = createStatsHistory(5, 1);

    for (let second = 0; second < 100; second += 1) {
      history.record(stats(second));
    }

    expect(history.samples()).toHaveLength(5);
  });

  it('上限に達したら古いものから捨て、時系列の順序を保つ', () => {
    const history = createStatsHistory(3, 1);

    for (let second = 0; second < 10; second += 1) {
      history.record(stats(second));
    }

    expect(history.samples().map((sample) => sample.elapsedSeconds)).toEqual([7, 8, 9]);
  });

  it('記録がない間は同じ配列を返す（useSyncExternalStore の要件）', () => {
    const history = createStatsHistory(10, 5);
    history.record(stats(0));

    const first = history.samples();
    history.record(stats(1));

    expect(history.samples()).toBe(first);
  });

  it('記録すると配列の参照が変わる', () => {
    const history = createStatsHistory(10, 5);
    history.record(stats(0));

    const first = history.samples();
    history.record(stats(5));

    expect(history.samples()).not.toBe(first);
  });

  it('追跡対象の形質だけを保持する', () => {
    const history = createStatsHistory(10, 5);
    history.record(stats(0, 10, 0.75));

    const sample = history.samples()[0];

    expect(Object.keys(sample.traitMeans).sort()).toEqual([...TRACKED_TRAITS].sort());
    expect(sample.traitMeans.speed).toBe(0.75);
  });

  it('reset で空になる', () => {
    const history = createStatsHistory(10, 5);
    history.record(stats(0));
    history.reset();

    expect(history.samples()).toHaveLength(0);
    expect(history.record(stats(0))).toBe(true);
  });
});
