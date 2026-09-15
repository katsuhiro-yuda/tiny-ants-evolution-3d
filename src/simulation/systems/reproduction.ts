import { MAX_POPULATION, OFFSPRING_SPAWN_DISTANCE } from '../config/genetics';
import { FIELD_BOUND } from '../config/world';
import { createAnt, type Ant, type BirthRecord } from '../entities/ant';
import { inheritGenome } from '../genetics/inherit';
import { computeOffspringEnergy } from '../genetics/traits';
import { isBlocked, type TerrainFeature } from '../resources/terrain';
import type { Random } from '../types';

/**
 * 繁殖（仕様書 §6「遺伝」, §14 Phase 2）。
 *
 * 親1個体から子を生成する簡略化モデル。親は成熟していてエネルギーに余裕があり、
 * 前回の繁殖から一定時間が経っている必要がある。子は形質を継承して変異する。
 */

/** 子の配置を試す回数。塞がれていたら別方向を試す。 */
const SPAWN_ATTEMPTS = 6;

/**
 * 繁殖の条件を満たしているか。
 *
 * 個体数上限は世界全体の状態なので、行動スコアではなくここで判定する
 * （上限に達している間は Reproduce を選ばせない）。
 */
export function canReproduce(ant: Ant, population: number): boolean {
  if (population >= MAX_POPULATION) {
    return false;
  }

  return (
    ant.age >= ant.traits.maturityAge &&
    ant.reproductionCooldown <= 0 &&
    ant.energy >= ant.traits.reproductionThreshold
  );
}

/**
 * 子を1体作り、親からエネルギーを差し引く。
 *
 * 親が支払うエネルギーのうち一部だけが子へ渡り、残りは繁殖のコストとして失われる。
 * 呼び出し側は条件（`canReproduce`）を満たしていることを保証すること。
 */
export function reproduce(
  parent: Ant,
  childId: string,
  random: Random,
  terrain: readonly TerrainFeature[],
): { child: Ant; record: BirthRecord } {
  const childGenome = inheritGenome(parent.genome, random);
  const childEnergy = computeOffspringEnergy(parent.genome, childGenome);

  parent.energy -= parent.traits.reproductionCost;
  parent.reproductionCooldown = parent.traits.reproductionCooldown;

  const spawn = findSpawnPoint(parent, random, terrain);

  const child = createAnt({
    id: childId,
    parentId: parent.id,
    // 系統は親から引き継ぐ。世代だけが進む（仕様書 §6）
    lineageId: parent.lineageId,
    generation: parent.generation + 1,
    genome: childGenome,
    x: spawn.x,
    z: spawn.z,
    heading: spawn.heading,
    energy: childEnergy,
    random,
  });

  return {
    child,
    record: { antId: child.id, parentId: parent.id, generation: child.generation },
  };
}

/**
 * 親の近くで、地形にも境界にもかからない位置を探す。
 * 見つからなければ親と同じ位置に置く。重なりは次のステップの移動で解消される。
 */
function findSpawnPoint(
  parent: Ant,
  random: Random,
  terrain: readonly TerrainFeature[],
): { x: number; z: number; heading: number } {
  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
    const heading = random.range(-Math.PI, Math.PI);
    const x = parent.position.x + Math.cos(heading) * OFFSPRING_SPAWN_DISTANCE;
    const z = parent.position.z + Math.sin(heading) * OFFSPRING_SPAWN_DISTANCE;

    const inside = Math.abs(x) <= FIELD_BOUND && Math.abs(z) <= FIELD_BOUND;
    if (inside && !isBlocked(terrain, x, z)) {
      return { x, z, heading };
    }
  }

  return { x: parent.position.x, z: parent.position.z, heading: parent.heading };
}
