import {
  FIELD_HALF,
  FIELD_MARGIN,
  INITIAL_ANT_COUNT,
  PHASE0_ANT_SPEED_MAX,
  PHASE0_ANT_SPEED_MIN,
} from '../config/world';
import type { Ant } from '../entities/ant';
import type { Random } from '../types';
import { createRandom } from './random';

/**
 * 世界の状態と更新。
 *
 * Phase 0の責務は「固定タイムステップで決定的に進むこと」の検証に限る。
 * 採食・エネルギー・遺伝はPhase 1以降で `systems/` へ追加する。
 */
export interface World {
  readonly seed: string;
  /** シミュレーション内の経過時間（秒）。実時間とは一致しない。 */
  elapsedSeconds: number;
  /** 実行済みの固定ステップ数。決定性の比較に使う。 */
  tick: number;
  ants: Ant[];
  random: Random;
}

/** 蟻が移動できる範囲の限界。 */
const BOUND = FIELD_HALF - FIELD_MARGIN;

/**
 * シードから世界を生成する。
 * 同一シードからは常に同一の初期配置になる（仕様書 §4, §14 Phase 0完了条件）。
 */
export function createWorld(seed: string, antCount: number = INITIAL_ANT_COUNT): World {
  const random = createRandom(seed);
  const ants: Ant[] = [];

  for (let i = 0; i < antCount; i += 1) {
    const heading = random.range(0, Math.PI * 2);
    const speed = random.range(PHASE0_ANT_SPEED_MIN, PHASE0_ANT_SPEED_MAX);

    ants.push({
      id: `ant-${i}`,
      lineageId: `lineage-${i}`,
      generation: 0,
      position: {
        x: random.range(-BOUND, BOUND),
        y: 0,
        z: random.range(-BOUND, BOUND),
      },
      velocity: {
        x: Math.cos(heading) * speed,
        y: 0,
        z: Math.sin(heading) * speed,
      },
      heading,
    });
  }

  return { seed, elapsedSeconds: 0, tick: 0, ants, random };
}

/**
 * 世界を1固定ステップ進める。
 *
 * Phase 0では境界反射付きの等速直線移動のみを行う。
 * 意思決定・行動スコアはPhase 1で `behaviors/` へ実装する。
 */
export function stepWorld(world: World, timestepSeconds: number): void {
  for (const ant of world.ants) {
    ant.position.x += ant.velocity.x * timestepSeconds;
    ant.position.z += ant.velocity.z * timestepSeconds;

    // 境界で反射させ、フィールド外へ出さない（仕様書 §4）。
    if (ant.position.x < -BOUND) {
      ant.position.x = -BOUND;
      ant.velocity.x = -ant.velocity.x;
    } else if (ant.position.x > BOUND) {
      ant.position.x = BOUND;
      ant.velocity.x = -ant.velocity.x;
    }

    if (ant.position.z < -BOUND) {
      ant.position.z = -BOUND;
      ant.velocity.z = -ant.velocity.z;
    } else if (ant.position.z > BOUND) {
      ant.position.z = BOUND;
      ant.velocity.z = -ant.velocity.z;
    }

    ant.heading = Math.atan2(ant.velocity.z, ant.velocity.x);
  }

  world.tick += 1;
  world.elapsedSeconds += timestepSeconds;
}
