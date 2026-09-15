import { FIELD_BOUND } from '../config/world';
import { MAX_TURN_RATE } from '../config/biology';
import { isBlocked, type TerrainFeature } from '../resources/terrain';
import type { Ant } from '../entities/ant';

/**
 * 移動（仕様書 §14 Phase 1）。
 *
 * 目標方位へ旋回速度の上限内で向きを変え、前進する。
 * 地形と境界にぶつかる場合は進まず、方位を変えて次ステップへ回す。
 */

/** 角度差を -π〜π へ正規化する。 */
export function normalizeAngle(angle: number): number {
  const wrapped = ((angle + Math.PI) % (Math.PI * 2)) + Math.PI * 2;
  return (wrapped % (Math.PI * 2)) - Math.PI;
}

/** 旋回速度の上限内で現在方位を目標方位へ近づける。 */
export function turnToward(
  currentHeading: number,
  targetHeading: number,
  timestepSeconds: number,
): number {
  const difference = normalizeAngle(targetHeading - currentHeading);
  const maxTurn = MAX_TURN_RATE * timestepSeconds;

  if (Math.abs(difference) <= maxTurn) {
    return normalizeAngle(targetHeading);
  }

  return normalizeAngle(currentHeading + Math.sign(difference) * maxTurn);
}

/**
 * 蟻を1ステップぶん移動させ、実際に移動した距離を返す。
 * 移動しない場合（速度0や進路が塞がれている場合）は0を返す。
 */
export function moveAnt(
  ant: Ant,
  targetHeading: number,
  speed: number,
  timestepSeconds: number,
  terrain: readonly TerrainFeature[],
): number {
  ant.heading = turnToward(ant.heading, targetHeading, timestepSeconds);

  if (speed <= 0) {
    ant.velocity.x = 0;
    ant.velocity.z = 0;
    return 0;
  }

  const distance = speed * timestepSeconds;
  const nextX = ant.position.x + Math.cos(ant.heading) * distance;
  const nextZ = ant.position.z + Math.sin(ant.heading) * distance;

  const outOfBounds =
    nextX < -FIELD_BOUND || nextX > FIELD_BOUND || nextZ < -FIELD_BOUND || nextZ > FIELD_BOUND;

  if (outOfBounds || isBlocked(terrain, nextX, nextZ)) {
    // 進路が塞がれている。反転させて次ステップで別方向を試す
    ant.heading = normalizeAngle(ant.heading + Math.PI);
    ant.velocity.x = 0;
    ant.velocity.z = 0;
    return 0;
  }

  ant.position.x = nextX;
  ant.position.z = nextZ;
  ant.velocity.x = Math.cos(ant.heading) * speed;
  ant.velocity.z = Math.sin(ant.heading) * speed;

  return distance;
}

/** 座標から目標への方位を求める。 */
export function headingTo(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toZ - fromZ, toX - fromX);
}
