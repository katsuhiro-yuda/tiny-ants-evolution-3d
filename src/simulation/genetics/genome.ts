import { INITIAL_GENE_MEAN, INITIAL_GENE_SPREAD } from '../config/genetics';
import type { Random } from '../types';

/**
 * 遺伝形質（仕様書 §5「遺伝形質」）。
 *
 * 各値は 0.0〜1.0。効果とコストの対応は `genetics/traits.ts` が持ち、
 * ここでは値そのものの表現と値域の維持だけを扱う。
 */
export interface Genome {
  /** 最大移動速度。コスト: 移動消費増。 */
  speed: number;
  /** 攻撃・防御・蓄積量。コスト: 基礎代謝増、旋回低下。 */
  bodySize: number;
  /** 被ダメージ軽減。コスト: 速度低下、代謝増。 */
  armor: number;
  /** 探索範囲。コスト: 感覚消費増。 */
  visionRange: number;
  /** 捕食・戦闘能力。コスト: 攻撃消費増。Phase 3 で効き始める。 */
  attack: number;
  /** 植物の栄養効率。コスト: 肉消化との両立コスト。 */
  plantDigestion: number;
  /** 肉の栄養効率。コスト: 植物消化との両立コスト。Phase 3 で効き始める。 */
  meatDigestion: number;
  /** エネルギー変換効率。コスト: 瞬発性能との両立コスト。 */
  metabolism: number;
  /** 繁殖しやすさ。コスト: 子の初期エネルギー低下。 */
  fertility: number;
  /** 寿命。コスト: 成熟が遅い。 */
  longevity: number;
  /** 巣・集団への帰属。コスト: 単独探索効率低下。Phase 4 で効き始める。 */
  sociability: number;
  /** 経路追従能力。コスト: 感覚消費増。Phase 4 で効き始める。 */
  pheromoneSensitivity: number;
  /** 他群への攻撃傾向。コスト: 戦闘リスク増。Phase 4 で効き始める。 */
  territoriality: number;
  /** 巣へ持ち帰る割合。コスト: 即時回復量低下。Phase 4 で効き始める。 */
  sharingRate: number;
}

/**
 * 全形質のキー。変異・統計・表示で走査するために順序を固定する。
 * 新しい形質を足したら、下の網羅チェックが型エラーで漏れを知らせる。
 */
export const GENOME_KEYS = [
  'speed',
  'bodySize',
  'armor',
  'visionRange',
  'attack',
  'plantDigestion',
  'meatDigestion',
  'metabolism',
  'fertility',
  'longevity',
  'sociability',
  'pheromoneSensitivity',
  'territoriality',
  'sharingRate',
] as const satisfies readonly (keyof Genome)[];

export type GenomeKey = (typeof GENOME_KEYS)[number];

/** GENOME_KEYS に載せ忘れた形質があれば、この型が never になり型エラーになる。 */
type MissingGenomeKey = Exclude<keyof Genome, GenomeKey>;
export type GenomeKeysAreExhaustive = MissingGenomeKey extends never ? true : never;

/** 形質値の下限・上限（仕様書 §6「すべての値を0.0〜1.0に収める」）。 */
export const GENE_MIN = 0;
export const GENE_MAX = 1;

/** 1つの形質値を値域へ収める。NaN は中立値へ倒す。 */
export function clampGene(value: number): number {
  if (!Number.isFinite(value)) {
    return INITIAL_GENE_MEAN;
  }
  if (value < GENE_MIN) {
    return GENE_MIN;
  }
  return value > GENE_MAX ? GENE_MAX : value;
}

/** 全形質を値域へ収めた新しい Genome を返す。 */
export function clampGenome(genome: Genome): Genome {
  const clamped = {} as Genome;
  for (const key of GENOME_KEYS) {
    clamped[key] = clampGene(genome[key]);
  }
  return clamped;
}

/**
 * 初期個体の Genome を作る。
 *
 * 中心値付近へ寄せた三角分布にする。一様分布にすると初期集団に極端な個体が多く含まれ、
 * 「変異と選択で分布が動いた」のか「最初からいた個体が生き残っただけ」なのか区別できなくなる。
 */
export function createInitialGenome(random: Random): Genome {
  const genome = {} as Genome;

  for (const key of GENOME_KEYS) {
    // 2つの一様乱数の平均は中央に山を持つ（三角分布）
    const centered = (random.next() + random.next()) / 2 - 0.5;
    genome[key] = clampGene(INITIAL_GENE_MEAN + centered * 2 * INITIAL_GENE_SPREAD);
  }

  return genome;
}
