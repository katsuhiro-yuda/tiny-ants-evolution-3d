import { DECISION_INTERVAL_SECONDS } from '../config/biology';
import { FOOD_INTAKE_PER_SECOND, FOOD_REACH } from '../config/resources';
import { decideBehavior } from '../behaviors/scores';
import type { DecisionContext } from '../behaviors/types';
import type { Ant, BirthRecord, DeathRecord } from '../entities/ant';
import { consumeFood, isEdible, type Food } from '../resources/food';
import type { TerrainFeature } from '../resources/terrain';
import type { UniformGrid } from '../spatial/uniformGrid';
import type { Random } from '../types';
import { headingTo, moveAnt, normalizeAngle } from './movement';
import { clampEnergy, computeEnergyCost, isStarved, isTooOld } from './metabolism';
import { startRegrowthDelay } from './regrowth';
import { canReproduce, reproduce } from './reproduction';

/**
 * 生存の1ステップ（仕様書 §14 Phase 1-2）。
 *
 * 意思決定 → 移動 → 採食・繁殖 → 代謝 → 死亡判定 の順に処理する。
 * 意思決定は個体ごとの間隔で間引き、毎ステップ全個体の判断を行わない（仕様書 §7）。
 */

/** Explore時に方位をふらつかせる幅（ラジアン/秒）。 */
const WANDER_JITTER = 1.1;

export interface SurvivalStepInput {
  ants: Ant[];
  foodGrid: UniformGrid<Food>;
  terrain: readonly TerrainFeature[];
  random: Random;
  timestepSeconds: number;
  /** 死亡した個体の記録先。呼び出し側で再利用する。 */
  deaths: DeathRecord[];
  /** 出生した個体の記録先。呼び出し側で再利用する。 */
  births: BirthRecord[];
  /** 子へ与えるIDを採番する。世界が通し番号を持つ。 */
  nextAntId: () => string;
}

export function updateSurvival(input: SurvivalStepInput): void {
  const { ants, foodGrid, terrain, random, timestepSeconds, deaths, births, nextAntId } = input;
  deaths.length = 0;
  births.length = 0;

  // 同一ステップ中に生まれた子は、次のステップから行動を始める
  const newborns: Ant[] = [];

  for (let i = ants.length - 1; i >= 0; i -= 1) {
    const ant = ants[i];

    if (ant.reproductionCooldown > 0) {
      ant.reproductionCooldown -= timestepSeconds;
    }

    // 視界内で最も近い、食べられる餌を探す。視界外は参照できない
    const visibleFood = foodGrid.findNearest(ant.position, ant.traits.visionRange, isEdible);
    const distanceToFood = visibleFood
      ? Math.hypot(visibleFood.position.x - ant.position.x, visibleFood.position.z - ant.position.z)
      : undefined;

    // 上限に近づくほど繁殖を抑える。個体数は出生と死亡で毎ステップ変わる
    const population = ants.length + newborns.length;

    updateDecision(ant, visibleFood, distanceToFood, population, random, timestepSeconds);

    const movedDistance = applyBehavior(
      ant,
      visibleFood,
      distanceToFood,
      terrain,
      random,
      timestepSeconds,
    );

    if (ant.state === 'Eat' && visibleFood) {
      eat(ant, visibleFood, timestepSeconds);
    }

    if (ant.state === 'Reproduce' && canReproduce(ant, population)) {
      const { child, record } = reproduce(ant, nextAntId(), random, terrain);
      newborns.push(child);
      births.push(record);
      // 繁殖直後は餌を探す状態へ戻す
      ant.state = 'Explore';
    }

    ant.energy = clampEnergy(
      ant.energy -
        computeEnergyCost(ant.traits, movedDistance, timestepSeconds, ant.state === 'Rest'),
      ant.traits.energyCapacity,
    );
    ant.age += timestepSeconds;

    const cause = isStarved(ant.energy)
      ? 'starvation'
      : isTooOld(ant.age, ant.lifespan)
        ? 'oldAge'
        : undefined;

    if (cause) {
      deaths.push({ antId: ant.id, cause, ageSeconds: ant.age });
      // 逆順に走査しているため、splice しても未処理の要素がずれない
      ants.splice(i, 1);
    }
  }

  for (const newborn of newborns) {
    ants.push(newborn);
  }
}

/** 意思決定の間引き。クールダウンが切れた個体だけが行動を選び直す。 */
function updateDecision(
  ant: Ant,
  visibleFood: Food | undefined,
  distanceToFood: number | undefined,
  population: number,
  random: Random,
  timestepSeconds: number,
): void {
  ant.decisionCooldown -= timestepSeconds;
  if (ant.decisionCooldown > 0) {
    // 追跡中の餌が食べ尽くされた場合だけは、次の判断を待たずに解除する
    if (ant.targetFoodId && (!visibleFood || visibleFood.id !== ant.targetFoodId)) {
      ant.targetFoodId = undefined;
    }
    return;
  }

  ant.decisionCooldown = DECISION_INTERVAL_SECONDS;

  const context: DecisionContext = {
    energyRatio: ant.energy / ant.traits.energyCapacity,
    visibleFood,
    distanceToFood,
    visionRange: ant.traits.visionRange,
    canReproduce: canReproduce(ant, population),
    noise: random.next(),
  };

  ant.state = decideBehavior(context);
  ant.targetFoodId = visibleFood?.id;
}

/** 選ばれた行動を実行し、移動距離を返す。 */
function applyBehavior(
  ant: Ant,
  visibleFood: Food | undefined,
  distanceToFood: number | undefined,
  terrain: readonly TerrainFeature[],
  random: Random,
  timestepSeconds: number,
): number {
  const maxSpeed = ant.traits.maxSpeed;

  switch (ant.state) {
    case 'SeekFood': {
      if (!visibleFood) {
        // 判断後に餌が消えた。次の判断までは探索として振る舞う
        return wander(ant, terrain, random, timestepSeconds);
      }

      const heading = headingTo(
        ant.position.x,
        ant.position.z,
        visibleFood.position.x,
        visibleFood.position.z,
      );

      // 行き過ぎないよう、残り距離を超えて進まない
      const speed =
        distanceToFood !== undefined
          ? Math.min(maxSpeed, Math.max(0, distanceToFood - FOOD_REACH * 0.5) / timestepSeconds)
          : maxSpeed;

      return moveAnt(ant, heading, Math.min(maxSpeed, speed), timestepSeconds, terrain);
    }

    case 'Eat':
    case 'Rest':
    case 'Reproduce':
      // その場に留まる
      ant.velocity.x = 0;
      ant.velocity.z = 0;
      return 0;

    case 'Explore':
    default:
      return wander(ant, terrain, random, timestepSeconds);
  }
}

/** ふらつきながら前進する。 */
function wander(
  ant: Ant,
  terrain: readonly TerrainFeature[],
  random: Random,
  timestepSeconds: number,
): number {
  ant.wanderHeading = normalizeAngle(
    ant.wanderHeading + random.range(-WANDER_JITTER, WANDER_JITTER) * timestepSeconds,
  );

  const moved = moveAnt(ant, ant.wanderHeading, ant.traits.maxSpeed, timestepSeconds, terrain);

  // 進路が塞がれて反転した場合は、ふらつきの基準方位も合わせる
  if (moved === 0) {
    ant.wanderHeading = ant.heading;
  }

  return moved;
}

/**
 * 餌を食べてエネルギーを回復する。
 * 取り出した量のうち、消化形質で決まる割合だけが自分のエネルギーになる（仕様書 §6）。
 */
function eat(ant: Ant, food: Food, timestepSeconds: number): void {
  const room = ant.traits.energyCapacity - ant.energy;
  if (room <= 0) {
    return;
  }

  const efficiency = ant.traits.plantEfficiency;
  // 満腹を超えて取り出さない。効率が低い個体は同じ回復量により多くの餌を要する
  const requested = Math.min(room / efficiency, FOOD_INTAKE_PER_SECOND * timestepSeconds);

  const taken = consumeFood(food, requested);
  ant.energy = clampEnergy(ant.energy + taken * efficiency, ant.traits.energyCapacity);
  startRegrowthDelay(food);
}
