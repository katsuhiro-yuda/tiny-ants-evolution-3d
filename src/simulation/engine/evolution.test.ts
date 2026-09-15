import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type World } from './world';
import { FIXED_TIMESTEP_SECONDS } from '../config/time';
import { MAX_POPULATION } from '../config/genetics';
import { GENOME_KEYS } from '../genetics/genome';
import { collectWorldStats } from '../queries/worldStats';

/**
 * 進化の統合テスト（仕様書 §14 Phase 2 の完了条件）。
 *
 * 「50世代以上で形質分布の変化を確認でき、同一条件で再現可能である」ことを確認する。
 * 世代交代は数百秒単位で進むため、他のテストより実行時間が長い。
 */

/** 50世代へ到達するまでの猶予（秒）。実測では2400〜2800秒で到達する。 */
const EVOLUTION_SECONDS = 3200;

const TARGET_GENERATION = 50;

/** 指定秒数ぶん世界を進める。 */
function run(world: World, seconds: number): void {
  const steps = Math.round(seconds / FIXED_TIMESTEP_SECONDS);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(world, FIXED_TIMESTEP_SECONDS);
  }
}

describe('世代交代', () => {
  it('50世代以上に到達し、その間ずっと個体が生存し続ける（Phase 2完了条件）', () => {
    const world = createWorld('evolution');
    const initialStats = collectWorldStats(world);

    let minPopulation = world.ants.length;
    let maxPopulation = world.ants.length;

    for (let second = 0; second < EVOLUTION_SECONDS; second += 1) {
      run(world, 1);

      minPopulation = Math.min(minPopulation, world.ants.length);
      maxPopulation = Math.max(maxPopulation, world.ants.length);

      if (world.maxGeneration >= TARGET_GENERATION) {
        break;
      }
    }

    const stats = collectWorldStats(world);

    expect(stats.maxGeneration).toBeGreaterThanOrEqual(TARGET_GENERATION);
    // 一度も絶滅しない。絶滅すると世代も止まる
    expect(minPopulation).toBeGreaterThan(0);
    // 上限を超えて増え続けない
    expect(maxPopulation).toBeLessThanOrEqual(MAX_POPULATION);
    expect(stats.birthCount).toBeGreaterThan(initialStats.population);

    // 形質分布が初期状態から変化している（仕様書 §14 Phase 2）
    const shifted = GENOME_KEYS.filter(
      (key) => Math.abs(stats.traitMeans[key] - initialStats.traitMeans[key]) > 0.05,
    );

    expect(shifted.length).toBeGreaterThan(0);
  }, 180_000);

  it('同一シードなら50世代後の形質分布まで一致する（再現性）', () => {
    const a = createWorld('reproducible');
    const b = createWorld('reproducible');

    run(a, 600);
    run(b, 600);

    const statsA = collectWorldStats(a);
    const statsB = collectWorldStats(b);

    expect(statsA.maxGeneration).toBe(statsB.maxGeneration);
    expect(statsA.population).toBe(statsB.population);
    expect(statsA.traitMeans).toEqual(statsB.traitMeans);
    expect(a.ants.map((ant) => ant.genome)).toEqual(b.ants.map((ant) => ant.genome));
    expect(a.ants.map((ant) => ant.id)).toEqual(b.ants.map((ant) => ant.id));
  }, 60_000);

  it('異なるシードでは異なる進化の経路をたどる', () => {
    const a = createWorld('path-a');
    const b = createWorld('path-b');

    run(a, 600);
    run(b, 600);

    expect(collectWorldStats(a).traitMeans).not.toEqual(collectWorldStats(b).traitMeans);
  }, 60_000);
});

describe('繁殖による個体の増減', () => {
  it('子が生まれ、世代と系統が記録される', () => {
    const world = createWorld('births');
    run(world, 120);

    const offspring = world.ants.filter((ant) => ant.generation > 0);

    expect(world.birthCount).toBeGreaterThan(0);
    expect(offspring.length).toBeGreaterThan(0);

    for (const ant of offspring) {
      expect(ant.parentId).toBeDefined();
      // 系統は初期個体から引き継がれる（仕様書 §6）
      expect(ant.lineageId).toMatch(/^lineage-\d+$/);
    }
  }, 30_000);

  it('個体IDが重複しない', () => {
    const world = createWorld('unique-ids');
    run(world, 300);

    expect(new Set(world.ants.map((ant) => ant.id)).size).toBe(world.ants.length);
  }, 30_000);

  it('餓死と寿命死の両方が発生する', () => {
    const world = createWorld('causes');
    const causes = new Set<string>();

    for (let second = 0; second < 600 && causes.size < 2; second += 1) {
      run(world, 1);
      for (const death of world.recentDeaths) {
        causes.add(death.cause);
      }
    }

    expect(causes).toEqual(new Set(['starvation', 'oldAge']));
  }, 60_000);

  it('recentBirths はステップごとに初期化される', () => {
    const world = createWorld('births-reset');

    let sawBirth = false;
    for (let i = 0; i < 60 * 120; i += 1) {
      stepWorld(world, FIXED_TIMESTEP_SECONDS);
      if (world.recentBirths.length > 0) {
        sawBirth = true;
        // 出生があったステップの次では空に戻る
        stepWorld(world, FIXED_TIMESTEP_SECONDS);
        if (world.recentBirths.length === 0) {
          break;
        }
      }
    }

    expect(sawBirth).toBe(true);
    expect(world.recentBirths).toHaveLength(0);
  }, 30_000);
});
