import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { DEFAULT_SEED, FIELD_SIZE } from '../simulation/config/world';
import { createSimulationRuntime } from '../state/simulationRuntime';
import { SimulationDriver } from '../state/SimulationDriver';
import { CameraRig } from '../world/camera/CameraRig';
import { WorldScene } from '../world/scene/WorldScene';
import { AntInstances } from '../world/renderers/AntInstances';
import { PerfHud } from '../components/PerfHud';
import { WebGLUnsupported } from '../components/WebGLUnsupported';
import { isWebGL2Available } from '../world/scene/webglSupport';
import './App.css';

/** 初期カメラ位置。フィールド全体を斜め上から見下ろす（仕様書 §9）。 */
const INITIAL_CAMERA_POSITION: [number, number, number] = [
  FIELD_SIZE * 0.55,
  FIELD_SIZE * 0.5,
  FIELD_SIZE * 0.55,
];

export function App() {
  // WebGL 2 非対応時は説明画面を出す（仕様書 §13）
  const webgl2Available = useMemo(() => isWebGL2Available(), []);

  // 世界はアプリの寿命と同じ。再生成すると同一シードでも進行がリセットされる
  const runtime = useMemo(() => createSimulationRuntime(DEFAULT_SEED), []);

  if (!webgl2Available) {
    return <WebGLUnsupported />;
  }

  return (
    <div className="app">
      <Canvas
        camera={{ position: INITIAL_CAMERA_POSITION, fov: 45, near: 0.1, far: FIELD_SIZE * 4 }}
        // 描画は SimulationDriver が明示的に行う
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#dfe9f3']} />
        <fog attach="fog" args={['#dfe9f3', FIELD_SIZE * 0.9, FIELD_SIZE * 2.2]} />

        <WorldScene />
        <AntInstances runtime={runtime} />
        <CameraRig />
        <SimulationDriver runtime={runtime} />
      </Canvas>

      {import.meta.env.DEV && <PerfHud runtime={runtime} />}
    </div>
  );
}
