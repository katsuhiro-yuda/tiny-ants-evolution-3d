import { describe, expect, it } from 'vitest';
import { createFixedStepClock } from './clock';
import { MAX_FRAME_DELTA_SECONDS, MAX_STEPS_PER_FRAME } from '../config/time';

const TIMESTEP = 1 / 60;

describe('createFixedStepClock', () => {
  it('1ステップ分溜まるまでステップを返さない', () => {
    const clock = createFixedStepClock(TIMESTEP);

    expect(clock.advance(TIMESTEP / 2, 1)).toBe(0);
    expect(clock.advance(TIMESTEP / 2, 1)).toBe(1);
  });

  it('端数を次フレームへ繰り越す', () => {
    const clock = createFixedStepClock(TIMESTEP);
    clock.advance(TIMESTEP * 1.5, 1);

    expect(clock.getPending()).toBeCloseTo(TIMESTEP * 0.5, 10);
  });

  it('速度倍率に比例してステップ数が増える', () => {
    const at1x = createFixedStepClock(TIMESTEP);
    const at4x = createFixedStepClock(TIMESTEP);

    expect(at1x.advance(TIMESTEP, 1)).toBe(1);
    expect(at4x.advance(TIMESTEP, 4)).toBe(4);
  });

  it('速度0では一時停止しステップが進まない', () => {
    const clock = createFixedStepClock(TIMESTEP);

    expect(clock.advance(1, 0)).toBe(0);
    expect(clock.getPending()).toBe(0);
  });

  it('負またはゼロのデルタを無視する', () => {
    const clock = createFixedStepClock(TIMESTEP);

    expect(clock.advance(0, 1)).toBe(0);
    expect(clock.advance(-1, 1)).toBe(0);
  });

  it('1フレームのステップ数に上限がある', () => {
    const clock = createFixedStepClock(TIMESTEP);

    expect(clock.advance(10, 4)).toBe(MAX_STEPS_PER_FRAME);
  });

  it('上限に達したフレームは負債を繰り越さない', () => {
    const clock = createFixedStepClock(TIMESTEP);
    clock.advance(10, 4);

    // 溜まった時間を持ち越すと次フレーム以降も上限に張り付き続けるため、破棄する
    expect(clock.getPending()).toBe(0);
  });

  it('巨大なデルタを上限で切り詰める（タブ復帰時に一括計算しない）', () => {
    const clamped = createFixedStepClock(TIMESTEP);
    const expectedSteps = Math.min(
      MAX_STEPS_PER_FRAME,
      Math.floor(MAX_FRAME_DELTA_SECONDS / TIMESTEP),
    );

    // 60秒間バックグラウンドにいた場合でも、切り詰め後の分しか進まない
    expect(clamped.advance(60, 1)).toBe(expectedSteps);
  });

  it('reset() で未消化の端数を破棄する', () => {
    const clock = createFixedStepClock(TIMESTEP);
    clock.advance(TIMESTEP * 0.9, 1);
    clock.reset();

    expect(clock.getPending()).toBe(0);
    expect(clock.advance(TIMESTEP * 0.5, 1)).toBe(0);
  });

  it('刻み続けたときのステップ総数が経過時間と一致する', () => {
    const clock = createFixedStepClock(TIMESTEP);
    let steps = 0;

    // 1秒ぶんを16.7ms刻みで投入する
    for (let i = 0; i < 60; i += 1) {
      steps += clock.advance(TIMESTEP, 1);
    }

    expect(steps).toBe(60);
  });
});
