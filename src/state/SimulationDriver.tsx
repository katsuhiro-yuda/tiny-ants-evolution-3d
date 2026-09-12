import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { SimulationRuntime } from './simulationRuntime';
import { useUiStore } from './uiStore';
import { FRAME_PRIORITY } from '../world/renderers/framePriority';

/**
 * 描画フレームとシミュレーションの接続点（仕様書 §12）。
 *
 * シミュレーション自体は React も Three.js も知らない。
 * このコンポーネントだけが両者を繋ぎ、順序と計測を担当する。
 */
interface SimulationDriverProps {
  runtime: SimulationRuntime;
}

export function SimulationDriver({ runtime }: SimulationDriverProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const speed = useUiStore((state) => state.speed);

  // UIの再生速度をシミュレーションへ反映する
  useEffect(() => {
    runtime.setSpeed(speed);
  }, [runtime, speed]);

  // タブがバックグラウンドから復帰したとき、経過時間を一括計算しない（仕様書 §4）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runtime.resetClock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [runtime]);

  // 1. シミュレーションを固定タイムステップで進める
  useFrame((_, delta) => {
    runtime.advance(delta);
  }, FRAME_PRIORITY.simulation);

  // 2. 明示的に描画し、フレームの計測を確定する
  useFrame((_, delta) => {
    const startedAt = performance.now();
    gl.render(scene, camera);
    runtime.addRenderMs(performance.now() - startedAt);
    runtime.commitFrame(delta);
  }, FRAME_PRIORITY.present);

  return null;
}
