import { FIELD_HALF, FIELD_MARGIN, INITIAL_ANT_COUNT } from '../config/world';
import {
  DECISION_INTERVAL_SECONDS,
  INITIAL_ENERGY,
  LIFESPAN_MAX_SECONDS,
  LIFESPAN_MIN_SECONDS,
  SPATIAL_CELL_SIZE,
} from '../config/biology';
import type { Ant, DeathRecord } from '../entities/ant';
import type { Food } from '../resources/food';
import { generateFood, generateTerrain } from '../resources/generate';
import { isBlocked, type TerrainFeature } from '../resources/terrain';
import { createUniformGrid, type UniformGrid } from '../spatial/uniformGrid';
import { updateFoodRegrowth } from '../systems/regrowth';
import { updateSurvival } from '../systems/survival';
import type { Random } from '../types';
import { createRandom } from './random';

/**
 * 世界の状態と更新。
 *
 * 各システムはここから順に呼ぶ。システム自体はReact・Three.jsを知らない純粋関数で、
 * DOMなしで単体テストできる（仕様書 §12）。
 */
export interface World {
  readonly seed: string;
  /** シミュレーション内の経過時間（秒）。実時間とは一致しない。 */
  elapsedSeconds: number;
  /** 実行済みの固定ステップ数。決定性の比較に使う。 */
  tick: number;
  ants: Ant[];
  foods: Food[];
  terrain: TerrainFeature[];
  random: Random;
  /** 直近ステップで死亡した個体。イベントログと統計が参照する。 */
  recentDeaths: DeathRecord[];
  /** 累計死亡数。 */
  deathCount: number;
  /** 餌の近傍探索用グリッド。毎ステップ再構築する。 */
  foodGrid: UniformGrid<Food>;
}

/** 蟻が移動できる範囲の限界。 */
const BOUND = FIELD_HALF - FIELD_MARGIN;

/** 地形と重ならない位置を探す試行回数。 */
const SPAWN_ATTEMPTS = 30;

/**
 * シードから世界を生成する。
 * 同一シードからは常に同一の初期状態になる（仕様書 §4, §14）。
 */
export function createWorld(seed: string, antCount: number = INITIAL_ANT_COUNT): World {
  const random = createRandom(seed);
  const terrain = generateTerrain(random);
  const foods = generateFood(random, terrain);
  const ants = generateAnts(random, terrain, antCount);

  const foodGrid = createUniformGrid<Food>(SPATIAL_CELL_SIZE);
  foodGrid.rebuild(foods);

  return {
    seed,
    elapsedSeconds: 0,
    tick: 0,
    ants,
    foods,
    terrain,
    random,
    recentDeaths: [],
    deathCount: 0,
    foodGrid,
  };
}

/** 地形を避けて蟻を配置する。 */
function generateAnts(random: Random, terrain: readonly TerrainFeature[], count: number): Ant[] {
  const ants: Ant[] = [];

  for (let i = 0; i < count; i += 1) {
    let x = 0;
    let z = 0;

    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
      x = random.range(-BOUND, BOUND);
      z = random.range(-BOUND, BOUND);
      if (!isBlocked(terrain, x, z)) {
        break;
      }
    }

    const heading = random.range(-Math.PI, Math.PI);

    ants.push({
      id: `ant-${i}`,
      lineageId: `lineage-${i}`,
      generation: 0,
      position: { x, y: 0, z },
      velocity: { x: 0, y: 0, z: 0 },
      heading,
      age: 0,
      lifespan: random.range(LIFESPAN_MIN_SECONDS, LIFESPAN_MAX_SECONDS),
      energy: INITIAL_ENERGY,
      state: 'Explore',
      // 意思決定タイミングを個体ごとにずらし、同一ステップへ集中させない（仕様書 §7）
      decisionCooldown: random.range(0, DECISION_INTERVAL_SECONDS),
      wanderHeading: heading,
    });
  }

  return ants;
}

/** 世界を1固定ステップ進める。 */
export function stepWorld(world: World, timestepSeconds: number): void {
  updateFoodRegrowth(world.foods, timestepSeconds);

  // 餌の残量は毎ステップ変わるため、探索前に再構築する
  world.foodGrid.rebuild(world.foods);

  updateSurvival({
    ants: world.ants,
    foodGrid: world.foodGrid,
    terrain: world.terrain,
    random: world.random,
    timestepSeconds,
    deaths: world.recentDeaths,
  });

  world.deathCount += world.recentDeaths.length;
  world.tick += 1;
  world.elapsedSeconds += timestepSeconds;
}
