import { createFixedStepClock, type FixedStepClock } from '../simulation/engine/clock';
import { createWorld, stepWorld, type World } from '../simulation/engine/world';
import { FIXED_TIMESTEP_SECONDS, type SpeedMultiplier } from '../simulation/config/time';
import { createPerfMetrics, type PerfSnapshot } from '../analytics/perfMetrics';
import { collectWorldStats, type WorldStats } from '../simulation/queries/worldStats';
import { createStatsHistory, type StatsSample } from '../analytics/statsHistory';

/**
 * シミュレーションと描画層の橋渡し（仕様書 §12 Application State）。
 *
 * React に依存しないプレーンなオブジェクトとして保持し、
 * UIは購読したスナップショットだけを受け取る。
 */

/** HUD・統計の更新頻度（ミリ秒）。毎フレーム再描画するとUI側が律速になるため間引く。 */
const SNAPSHOT_INTERVAL_MS = 250;

export interface SimulationRuntime {
  readonly world: World;
  getSpeed: () => SpeedMultiplier;
  setSpeed: (speed: SpeedMultiplier) => void;
  /** 1描画フレーム分シミュレーションを進め、消化したステップ数を返す。 */
  advance: (frameDeltaSeconds: number) => number;
  /** 描画に要した時間をフレーム内で加算する。 */
  addRenderMs: (ms: number) => void;
  /** フレーム末尾で計測値を確定し、必要なら購読者へ通知する。 */
  commitFrame: (frameDeltaSeconds: number) => void;
  /** タブ復帰時など、溜まった時間を破棄する。 */
  resetClock: () => void;

  subscribe: (listener: () => void) => () => void;
  getPerfSnapshot: () => PerfSnapshot;
  subscribeStats: (listener: () => void) => () => void;
  getStatsSnapshot: () => WorldStats;
  /** 統計の時系列。上限付きで、古いサンプルから捨てられる（仕様書 §10）。 */
  getStatsHistory: () => readonly StatsSample[];
}

export function createSimulationRuntime(seed: string): SimulationRuntime {
  const world = createWorld(seed);
  const clock: FixedStepClock = createFixedStepClock(FIXED_TIMESTEP_SECONDS);
  const metrics = createPerfMetrics();
  const history = createStatsHistory();
  const perfListeners = new Set<() => void>();
  const statsListeners = new Set<() => void>();

  let speed: SpeedMultiplier = 1;
  let frameSimulationMs = 0;
  let frameRenderMs = 0;
  let frameSteps = 0;
  let lastPublishedAt = 0;
  let perfSnapshot: PerfSnapshot = metrics.snapshot();
  let statsSnapshot: WorldStats = collectWorldStats(world);

  return {
    world,

    getSpeed: () => speed,

    setSpeed(next: SpeedMultiplier): void {
      speed = next;
    },

    advance(frameDeltaSeconds: number): number {
      const steps = clock.advance(frameDeltaSeconds, speed);
      const startedAt = performance.now();

      for (let i = 0; i < steps; i += 1) {
        stepWorld(world, FIXED_TIMESTEP_SECONDS);
      }

      frameSimulationMs = performance.now() - startedAt;
      frameSteps = steps;
      return steps;
    },

    addRenderMs(ms: number): void {
      frameRenderMs += ms;
    },

    commitFrame(frameDeltaSeconds: number): void {
      metrics.record(frameDeltaSeconds, frameSimulationMs, frameRenderMs, frameSteps);
      frameRenderMs = 0;

      const now = performance.now();
      if (now - lastPublishedAt < SNAPSHOT_INTERVAL_MS) {
        return;
      }

      lastPublishedAt = now;
      perfSnapshot = metrics.snapshot();
      statsSnapshot = collectWorldStats(world);
      history.record(statsSnapshot);

      for (const listener of perfListeners) {
        listener();
      }
      for (const listener of statsListeners) {
        listener();
      }
    },

    resetClock(): void {
      clock.reset();
    },

    subscribe(listener: () => void): () => void {
      perfListeners.add(listener);
      return () => perfListeners.delete(listener);
    },

    getPerfSnapshot: () => perfSnapshot,

    subscribeStats(listener: () => void): () => void {
      statsListeners.add(listener);
      return () => statsListeners.delete(listener);
    },

    getStatsSnapshot: () => statsSnapshot,

    getStatsHistory: history.samples,
  };
}
