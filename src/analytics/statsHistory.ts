import type { GenomeKey } from '../simulation/genetics/genome';
import type { WorldStats } from '../simulation/queries/worldStats';

/**
 * 統計の時系列（仕様書 §10「統計の時系列データは上限を設け、長時間実行時に
 * メモリが増え続けないようにする」）。
 *
 * 固定長のリングバッファへ、シミュレーション時間で一定間隔ごとに記録する。
 * 描画フレームレートに依存しないため、速度を変えてもグラフの目盛りは揃う。
 */

/** 時系列として残す形質。全14形質を残すとサンプルあたりの容量が増えるため主要なものに絞る。 */
export const TRACKED_TRAITS = [
  'speed',
  'bodySize',
  'armor',
  'visionRange',
  'metabolism',
  'fertility',
  'longevity',
] as const satisfies readonly GenomeKey[];

export type TrackedTrait = (typeof TRACKED_TRAITS)[number];

export interface StatsSample {
  /** シミュレーション内の経過時間（秒）。 */
  elapsedSeconds: number;
  population: number;
  maxGeneration: number;
  traitMeans: Record<TrackedTrait, number>;
}

/** 記録の間隔（シミュレーション秒）。 */
export const HISTORY_INTERVAL_SECONDS = 5;

/** 保持するサンプル数の上限。間隔5秒なら約30分ぶん。 */
export const HISTORY_CAPACITY = 360;

export interface StatsHistory {
  /**
   * 統計を記録する。前回の記録から間隔が空いていなければ何もしない。
   * @returns 実際に記録したら true
   */
  record: (stats: WorldStats) => boolean;
  /**
   * 古い順に並んだサンプル。
   * 記録があるまでは同じ配列を返すため、`useSyncExternalStore` から直接参照できる。
   */
  samples: () => readonly StatsSample[];
  reset: () => void;
}

export function createStatsHistory(
  capacity: number = HISTORY_CAPACITY,
  intervalSeconds: number = HISTORY_INTERVAL_SECONDS,
): StatsHistory {
  // リングバッファ本体。参照が変わらないよう、公開用の配列とは分けて持つ
  const buffer: StatsSample[] = [];
  let writeIndex = 0;
  let lastRecordedAt = Number.NEGATIVE_INFINITY;
  let published: readonly StatsSample[] = [];

  return {
    record(stats: WorldStats): boolean {
      if (stats.elapsedSeconds - lastRecordedAt < intervalSeconds) {
        return false;
      }
      lastRecordedAt = stats.elapsedSeconds;

      const traitMeans = {} as Record<TrackedTrait, number>;
      for (const trait of TRACKED_TRAITS) {
        traitMeans[trait] = stats.traitMeans[trait];
      }

      const sample: StatsSample = {
        elapsedSeconds: stats.elapsedSeconds,
        population: stats.population,
        maxGeneration: stats.maxGeneration,
        traitMeans,
      };

      if (buffer.length < capacity) {
        buffer.push(sample);
      } else {
        // 上限に達したら最も古いサンプルを上書きする
        buffer[writeIndex] = sample;
        writeIndex = (writeIndex + 1) % capacity;
      }

      published =
        buffer.length < capacity
          ? buffer.slice()
          : [...buffer.slice(writeIndex), ...buffer.slice(0, writeIndex)];

      return true;
    },

    samples: () => published,

    reset(): void {
      buffer.length = 0;
      writeIndex = 0;
      lastRecordedAt = Number.NEGATIVE_INFINITY;
      published = [];
    },
  };
}
