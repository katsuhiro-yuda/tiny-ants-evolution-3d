import { createFixedStepClock, type FixedStepClock } from '../simulation/engine/clock';
import { createWorld, stepWorld, type World } from '../simulation/engine/world';
import { FIXED_TIMESTEP_SECONDS, type SpeedMultiplier } from '../simulation/config/time';
import { createPerfMetrics, type PerfSnapshot } from '../analytics/perfMetrics';

/**
 * シミュレーションと描画層の橋渡し（仕様書 §12 Application State）。
 *
 * React に依存しないプレーンなオブジェクトとして保持し、
 * UIは `subscribe` 経由でスナップショットだけを受け取る。
 * Phase 1でZustandを導入する際も、この境界はそのまま残す。
 */

/** HUDの更新頻度（ミリ秒）。毎フレーム再描画するとUI側が律速になるため間引く。 */
const HUD_UPDATE_INTERVAL_MS = 250;

export interface SimulationRuntime {
  readonly world: World;
  getSpeed: () => SpeedMultiplier;
  setSpeed: (speed: SpeedMultiplier) => void;
  /** 1描画フレーム分シミュレーションを進め、消化したステップ数を返す。 */
  advance: (frameDeltaSeconds: number) => number;
  /** 描画に要した時間をフレーム内で加算する。 */
  addRenderMs: (ms: number) => void;
  /** フレーム末尾で計測値を確定し、必要ならHUDへ通知する。 */
  commitFrame: (frameDeltaSeconds: number) => void;
  /** タブ復帰時など、溜まった時間を破棄する。 */
  resetClock: () => void;
  subscribe: (listener: () => void) => () => void;
  getPerfSnapshot: () => PerfSnapshot;
}

export function createSimulationRuntime(seed: string): SimulationRuntime {
  const world = createWorld(seed);
  const clock: FixedStepClock = createFixedStepClock(FIXED_TIMESTEP_SECONDS);
  const metrics = createPerfMetrics();
  const listeners = new Set<() => void>();

  let speed: SpeedMultiplier = 1;
  let frameSimulationMs = 0;
  let frameRenderMs = 0;
  let frameSteps = 0;
  let lastPublishedAt = 0;
  let snapshot: PerfSnapshot = metrics.snapshot();

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
      if (now - lastPublishedAt >= HUD_UPDATE_INTERVAL_MS) {
        lastPublishedAt = now;
        snapshot = metrics.snapshot();
        for (const listener of listeners) {
          listener();
        }
      }
    },

    resetClock(): void {
      clock.reset();
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getPerfSnapshot: () => snapshot,
  };
}
