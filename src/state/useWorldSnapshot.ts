import { useMemo, useSyncExternalStore } from 'react';
import type { SimulationRuntime } from './simulationRuntime';
import type { WorldStats } from '../simulation/queries/worldStats';
import type { StatsSample } from '../analytics/statsHistory';
import { findAntSummary, type AntSummary } from '../simulation/queries/antSummary';

/**
 * シミュレーションの集計値をReactへ流す。
 *
 * 毎ステップ再描画するとUI側が律速になるため、runtime 側で間引いた
 * スナップショットだけを購読する（仕様書 §13）。
 */
export function useWorldStats(runtime: SimulationRuntime): WorldStats {
  return useSyncExternalStore(runtime.subscribeStats, runtime.getStatsSnapshot);
}

/**
 * 統計の時系列を購読する。
 * 記録がない間は同じ配列参照が返るため、そのまま getSnapshot に使える。
 */
export function useStatsHistory(runtime: SimulationRuntime): readonly StatsSample[] {
  return useSyncExternalStore(runtime.subscribeStats, runtime.getStatsHistory);
}

/**
 * 選択個体の表示用ビューを購読する。
 *
 * `useSyncExternalStore` の getSnapshot は、状態が変わっていない限り
 * 同じ参照を返さなければ無限ループになる。個体ビューは呼び出しごとに
 * 新しいオブジェクトになるため、統計スナップショットの更新を区切りとして
 * キャッシュする。
 */
export function useAntSummary(
  runtime: SimulationRuntime,
  antId: string | undefined,
): AntSummary | undefined {
  const getSnapshot = useMemo(() => {
    let cachedStats: WorldStats | undefined;
    let cachedSummary: AntSummary | undefined;

    return (): AntSummary | undefined => {
      const stats = runtime.getStatsSnapshot();
      if (stats !== cachedStats) {
        cachedStats = stats;
        cachedSummary = findAntSummary(runtime.world.ants, antId, stats.featureThresholds);
      }
      return cachedSummary;
    };
  }, [runtime, antId]);

  return useSyncExternalStore(runtime.subscribeStats, getSnapshot);
}
