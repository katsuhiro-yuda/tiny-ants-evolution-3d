import { MAX_ENERGY } from '../config/biology';
import type { Ant } from '../entities/ant';
import type { AntBehaviorState } from '../behaviors/types';

/**
 * UI表示用の読み取り専用ビュー。
 *
 * 描画・UI専用の整形をシミュレーションのモデルへ混ぜないため、
 * 参照時にここで変換する（仕様書 §12）。
 */
export interface AntSummary {
  id: string;
  lineageId: string;
  generation: number;
  ageSeconds: number;
  lifespanSeconds: number;
  /** 0〜1で正規化したエネルギー。 */
  energyRatio: number;
  energy: number;
  state: AntBehaviorState;
  position: { x: number; z: number };
}

/** 行動状態の日本語ラベル。色だけに頼らず文字でも示す（仕様書 §13）。 */
export const BEHAVIOR_LABELS: Record<AntBehaviorState, string> = {
  Explore: '探索',
  SeekFood: '餌へ接近',
  Eat: '採食',
  Rest: '休息',
};

export function toAntSummary(ant: Ant): AntSummary {
  return {
    id: ant.id,
    lineageId: ant.lineageId,
    generation: ant.generation,
    ageSeconds: ant.age,
    lifespanSeconds: ant.lifespan,
    energyRatio: ant.energy / MAX_ENERGY,
    energy: ant.energy,
    state: ant.state,
    position: { x: ant.position.x, z: ant.position.z },
  };
}

/** IDから個体を探す。見つからなければ undefined（死亡した個体など）。 */
export function findAntSummary(
  ants: readonly Ant[],
  antId: string | undefined,
): AntSummary | undefined {
  if (!antId) {
    return undefined;
  }

  const ant = ants.find((candidate) => candidate.id === antId);
  return ant ? toAntSummary(ant) : undefined;
}
