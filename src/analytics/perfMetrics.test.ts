import { describe, expect, it } from 'vitest';
import { createPerfMetrics } from './perfMetrics';

describe('createPerfMetrics', () => {
  it('サンプルがなければすべて0を返す', () => {
    expect(createPerfMetrics().snapshot()).toEqual({
      fps: 0,
      renderMs: 0,
      simulationMs: 0,
      steps: 0,
    });
  });

  it('フレーム間隔の平均からFPSを算出する', () => {
    const metrics = createPerfMetrics();
    for (let i = 0; i < 60; i += 1) {
      metrics.record(1 / 60, 0, 0, 1);
    }

    expect(metrics.snapshot().fps).toBeCloseTo(60, 6);
  });

  it('更新時間と描画時間を平均する', () => {
    const metrics = createPerfMetrics();
    metrics.record(1 / 60, 2, 4, 1);
    metrics.record(1 / 60, 4, 8, 1);

    const snapshot = metrics.snapshot();
    expect(snapshot.simulationMs).toBeCloseTo(3, 10);
    expect(snapshot.renderMs).toBeCloseTo(6, 10);
  });

  it('窓幅を超えた古いサンプルを切り捨てる', () => {
    const metrics = createPerfMetrics(3);
    metrics.record(1 / 10, 100, 100, 1);
    metrics.record(1 / 60, 1, 1, 1);
    metrics.record(1 / 60, 1, 1, 1);
    metrics.record(1 / 60, 1, 1, 1);

    // 最初の遅いフレームは窓から押し出されている
    const snapshot = metrics.snapshot();
    expect(snapshot.fps).toBeCloseTo(60, 6);
    expect(snapshot.simulationMs).toBeCloseTo(1, 10);
  });

  it('直近のステップ数を保持する', () => {
    const metrics = createPerfMetrics();
    metrics.record(1 / 60, 1, 1, 4);

    expect(metrics.snapshot().steps).toBe(4);
  });

  it('0以下のフレーム間隔をFPS算出から除外する', () => {
    const metrics = createPerfMetrics();
    metrics.record(0, 1, 1, 0);
    metrics.record(-1, 1, 1, 0);

    expect(metrics.snapshot().fps).toBe(0);
    // 更新時間・描画時間は記録される
    expect(metrics.snapshot().simulationMs).toBeCloseTo(1, 10);
  });

  it('reset() で計測値を初期化する', () => {
    const metrics = createPerfMetrics();
    metrics.record(1 / 30, 5, 5, 2);
    metrics.reset();

    expect(metrics.snapshot()).toEqual({ fps: 0, renderMs: 0, simulationMs: 0, steps: 0 });
  });

  it('長時間記録してもメモリが増えない（固定長バッファ）', () => {
    const metrics = createPerfMetrics(60);
    for (let i = 0; i < 100000; i += 1) {
      metrics.record(1 / 60, 1, 1, 1);
    }

    expect(metrics.snapshot().fps).toBeCloseTo(60, 6);
  });
});
