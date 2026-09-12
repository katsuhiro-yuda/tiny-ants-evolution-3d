/**
 * 性能計測（仕様書 §13「FPS、描画時間、シミュレーション更新時間を開発モードで確認可能にする」）。
 *
 * 描画・DOMに依存しない純粋ロジックとして実装し、単体テスト可能にする。
 * 依存ライブラリ（stats.js等）を追加しないのは、計測対象が3値のみで
 * シミュレーション更新時間はどのみち自前計測になるため。
 */

/** 移動平均の窓幅（フレーム数）。約1秒分。 */
const SAMPLE_WINDOW = 60;

export interface PerfSnapshot {
  /** 直近の平均FPS。サンプルがなければ0。 */
  fps: number;
  /** 1フレームあたりの平均描画時間（ミリ秒）。 */
  renderMs: number;
  /** 1フレームあたりの平均シミュレーション更新時間（ミリ秒）。 */
  simulationMs: number;
  /** 直近フレームで消化した固定ステップ数。 */
  steps: number;
}

export interface PerfMetrics {
  /**
   * 1フレーム分の計測値を記録する。
   *
   * @param frameDeltaSeconds フレーム間隔（秒）
   * @param simulationMs そのフレームで費やしたシミュレーション更新時間（ミリ秒）
   * @param renderMs そのフレームで費やした描画準備時間（ミリ秒）
   * @param steps そのフレームで消化した固定ステップ数
   */
  record: (
    frameDeltaSeconds: number,
    simulationMs: number,
    renderMs: number,
    steps: number,
  ) => void;
  /** 現在の移動平均を取得する。 */
  snapshot: () => PerfSnapshot;
  reset: () => void;
}

/** 固定長リングバッファの合計を保ちながら平均を返す。 */
function createRingAverage(capacity: number) {
  const values = new Float64Array(capacity);
  let count = 0;
  let index = 0;
  let sum = 0;

  return {
    push(value: number): void {
      if (count === capacity) {
        sum -= values[index];
      } else {
        count += 1;
      }
      values[index] = value;
      sum += value;
      index = (index + 1) % capacity;
    },
    average(): number {
      return count === 0 ? 0 : sum / count;
    },
    clear(): void {
      values.fill(0);
      count = 0;
      index = 0;
      sum = 0;
    },
  };
}

export function createPerfMetrics(sampleWindow: number = SAMPLE_WINDOW): PerfMetrics {
  const frameSeconds = createRingAverage(sampleWindow);
  const simulation = createRingAverage(sampleWindow);
  const render = createRingAverage(sampleWindow);
  let lastSteps = 0;

  return {
    record(frameDeltaSeconds, simulationMs, renderMs, steps): void {
      // 0以下のデルタはFPS算出で発散するため無視する。
      if (frameDeltaSeconds > 0) {
        frameSeconds.push(frameDeltaSeconds);
      }
      simulation.push(simulationMs);
      render.push(renderMs);
      lastSteps = steps;
    },

    snapshot(): PerfSnapshot {
      const averageFrameSeconds = frameSeconds.average();
      return {
        fps: averageFrameSeconds > 0 ? 1 / averageFrameSeconds : 0,
        renderMs: render.average(),
        simulationMs: simulation.average(),
        steps: lastSteps,
      };
    },

    reset(): void {
      frameSeconds.clear();
      simulation.clear();
      render.clear();
      lastSteps = 0;
    },
  };
}
