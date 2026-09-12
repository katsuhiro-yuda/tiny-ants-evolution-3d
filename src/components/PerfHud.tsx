import { useSyncExternalStore } from 'react';
import type { SimulationRuntime } from '../state/simulationRuntime';
import './PerfHud.css';

/**
 * 性能表示（仕様書 §13）。
 * 開発モードでのみ表示する。計測ロジック自体は `analytics/perfMetrics` にある。
 */
interface PerfHudProps {
  runtime: SimulationRuntime;
}

export function PerfHud({ runtime }: PerfHudProps) {
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getPerfSnapshot);

  return (
    <dl className="perf-hud" aria-label="性能計測">
      <div className="perf-hud__row">
        <dt>FPS</dt>
        <dd>{snapshot.fps.toFixed(1)}</dd>
      </div>
      <div className="perf-hud__row">
        <dt>描画</dt>
        <dd>{snapshot.renderMs.toFixed(2)} ms</dd>
      </div>
      <div className="perf-hud__row">
        <dt>更新</dt>
        <dd>{snapshot.simulationMs.toFixed(2)} ms</dd>
      </div>
      <div className="perf-hud__row">
        <dt>ステップ</dt>
        <dd>{snapshot.steps}</dd>
      </div>
      <div className="perf-hud__row">
        <dt>個体数</dt>
        <dd>{runtime.world.ants.length}</dd>
      </div>
    </dl>
  );
}
