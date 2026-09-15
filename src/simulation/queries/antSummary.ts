import type { Ant } from '../entities/ant';
import type { AntBehaviorState } from '../behaviors/types';
import type { Genome, GenomeKey } from '../genetics/genome';
import {
  computeDiet,
  computeFeatureLabels,
  type DietType,
  type FeatureThresholds,
  type FeatureTrait,
} from '../genetics/ecotype';

/**
 * UI表示用の読み取り専用ビュー。
 *
 * 描画・UI専用の整形をシミュレーションのモデルへ混ぜないため、
 * 参照時にここで変換する（仕様書 §12）。
 */
export interface AntSummary {
  id: string;
  parentId: string | undefined;
  lineageId: string;
  generation: number;
  ageSeconds: number;
  lifespanSeconds: number;
  /** 0〜1で正規化したエネルギー。上限は個体ごとに異なる。 */
  energyRatio: number;
  energy: number;
  energyCapacity: number;
  state: AntBehaviorState;
  position: { x: number; z: number };

  /** 全遺伝形質（仕様書 §10「個体詳細」）。 */
  genome: Genome;
  diet: DietType;
  /** 集団内で上位20%に入る形質。最大2つ。 */
  featureLabels: FeatureTrait[];
  /** 繁殖できる年齢か。 */
  mature: boolean;
  maturityAgeSeconds: number;
}

/** 行動状態の日本語ラベル。色だけに頼らず文字でも示す（仕様書 §13）。 */
export const BEHAVIOR_LABELS: Record<AntBehaviorState, string> = {
  Explore: '探索',
  SeekFood: '餌へ接近',
  Eat: '採食',
  Rest: '休息',
  Reproduce: '繁殖',
};

/** 食性ラベルの日本語表記（仕様書 §6）。 */
export const DIET_LABELS: Record<DietType, string> = {
  herbivore: '草食型',
  carnivore: '肉食型',
  omnivore: '雑食型',
};

/** 特徴ラベルの日本語表記。 */
export const FEATURE_LABELS: Record<FeatureTrait, string> = {
  speed: '俊足',
  armor: '重装甲',
  bodySize: '大型',
  visionRange: '広視野',
  fertility: '多産',
};

/** 遺伝形質の日本語表記。個体詳細と統計パネルで共用する。 */
export const TRAIT_LABELS: Record<GenomeKey, string> = {
  speed: '速度',
  bodySize: '体格',
  armor: '装甲',
  visionRange: '視野',
  attack: '攻撃',
  plantDigestion: '植物消化',
  meatDigestion: '肉消化',
  metabolism: '代謝効率',
  fertility: '繁殖力',
  longevity: '寿命',
  sociability: '社会性',
  pheromoneSensitivity: 'フェロモン感度',
  territoriality: '縄張り',
  sharingRate: '共有率',
};

export function toAntSummary(ant: Ant, thresholds: FeatureThresholds): AntSummary {
  return {
    id: ant.id,
    parentId: ant.parentId,
    lineageId: ant.lineageId,
    generation: ant.generation,
    ageSeconds: ant.age,
    lifespanSeconds: ant.lifespan,
    energyRatio: ant.energy / ant.traits.energyCapacity,
    energy: ant.energy,
    energyCapacity: ant.traits.energyCapacity,
    state: ant.state,
    position: { x: ant.position.x, z: ant.position.z },
    // 参照を渡すとUI側の書き換えがシミュレーションへ波及するため複製する
    genome: { ...ant.genome },
    diet: computeDiet(ant.genome),
    featureLabels: computeFeatureLabels(ant.genome, thresholds),
    mature: ant.age >= ant.traits.maturityAge,
    maturityAgeSeconds: ant.traits.maturityAge,
  };
}

/** IDから個体を探す。見つからなければ undefined（死亡した個体など）。 */
export function findAntSummary(
  ants: readonly Ant[],
  antId: string | undefined,
  thresholds: FeatureThresholds,
): AntSummary | undefined {
  if (!antId) {
    return undefined;
  }

  const ant = ants.find((candidate) => candidate.id === antId);
  return ant ? toAntSummary(ant, thresholds) : undefined;
}
