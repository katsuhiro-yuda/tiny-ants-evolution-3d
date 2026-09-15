import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { DEFAULT_SEED, FIELD_SIZE } from '../simulation/config/world';
import { createSimulationRuntime } from '../state/simulationRuntime';
import { SimulationDriver } from '../state/SimulationDriver';
import { useUiStore } from '../state/uiStore';
import { nextAntId } from '../state/selection';
import { CameraRig } from '../world/camera/CameraRig';
import { WorldScene } from '../world/scene/WorldScene';
import { AntInstances } from '../world/renderers/AntInstances';
import { FoodInstances } from '../world/renderers/FoodInstances';
import { TerrainFeatures } from '../world/renderers/TerrainFeatures';
import { PerfHud } from '../components/PerfHud';
import { TopBar } from '../components/TopBar';
import { AntDetailPanel } from '../components/AntDetailPanel';
import { StatsPanel } from '../components/StatsPanel';
import { SelectionControls } from '../components/SelectionControls';
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

  const togglePause = useUiStore((state) => state.togglePause);
  const selectAnt = useUiStore((state) => state.selectAnt);

  // キーボード操作（仕様書 §13「UI操作をキーボードで選択できる」）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 入力欄へのキー入力を奪わない
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        togglePause();
      } else if (event.code === 'Escape') {
        selectAnt(undefined);
      } else if (event.code === 'BracketRight' || event.key === 'n') {
        const { selectedAntId } = useUiStore.getState();
        selectAnt(nextAntId(runtime.world.ants, selectedAntId, 1));
      } else if (event.code === 'BracketLeft' || event.key === 'p') {
        const { selectedAntId } = useUiStore.getState();
        selectAnt(nextAntId(runtime.world.ants, selectedAntId, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause, selectAnt, runtime]);

  if (!webgl2Available) {
    return <WebGLUnsupported />;
  }

  return (
    <div className="app">
      <Canvas
        camera={{ position: INITIAL_CAMERA_POSITION, fov: 45, near: 0.1, far: FIELD_SIZE * 4 }}
        gl={{ antialias: true }}
        // 何もない場所をクリックしたら選択を解除する
        onPointerMissed={() => selectAnt(undefined)}
      >
        <color attach="background" args={['#dfe9f3']} />
        <fog attach="fog" args={['#dfe9f3', FIELD_SIZE * 0.9, FIELD_SIZE * 2.2]} />

        <WorldScene />
        <TerrainFeatures terrain={runtime.world.terrain} />
        <FoodInstances runtime={runtime} />
        <AntInstances runtime={runtime} />
        <CameraRig />
        <SimulationDriver runtime={runtime} />
      </Canvas>

      <TopBar runtime={runtime} />
      <div className="app__side-panels">
        {/* HUDを先に置き、選択の有無でHUDの位置が動かないようにする */}
        {import.meta.env.DEV && <PerfHud runtime={runtime} />}
        <AntDetailPanel runtime={runtime} />
      </div>
      {/* 左下のパネル列。重ならないよう縦に積む */}
      <div className="app__bottom-panels">
        <SelectionControls runtime={runtime} />
        <StatsPanel runtime={runtime} />
      </div>
    </div>
  );
}
