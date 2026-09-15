import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ speed: 1, selectedAntId: undefined });
  });

  it('初期状態は等倍再生・未選択', () => {
    const state = useUiStore.getState();

    expect(state.speed).toBe(1);
    expect(state.selectedAntId).toBeUndefined();
  });

  it('速度を変更できる', () => {
    useUiStore.getState().setSpeed(4);

    expect(useUiStore.getState().speed).toBe(4);
  });

  it('一時停止と再開を切り替える', () => {
    useUiStore.getState().togglePause();
    expect(useUiStore.getState().speed).toBe(0);

    useUiStore.getState().togglePause();
    expect(useUiStore.getState().speed).toBe(1);
  });

  it('4倍速から一時停止すると再開時は等倍へ戻る', () => {
    useUiStore.getState().setSpeed(4);
    useUiStore.getState().togglePause();
    useUiStore.getState().togglePause();

    expect(useUiStore.getState().speed).toBe(1);
  });

  it('個体を選択・解除できる', () => {
    useUiStore.getState().selectAnt('ant-3');
    expect(useUiStore.getState().selectedAntId).toBe('ant-3');

    useUiStore.getState().selectAnt(undefined);
    expect(useUiStore.getState().selectedAntId).toBeUndefined();
  });
});
