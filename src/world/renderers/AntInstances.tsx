import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Color, Matrix4, Object3D } from 'three';
import type { InstancedMesh } from 'three';
import { ANT_BASE_LENGTH, INITIAL_ANT_COUNT } from '../../simulation/config/world';
import type { AntBehaviorState } from '../../simulation/behaviors/types';
import type { SimulationRuntime } from '../../state/simulationRuntime';
import { useUiStore } from '../../state/uiStore';
import { FRAME_PRIORITY } from './framePriority';

/**
 * 蟻の一括描画（仕様書 §11「蟻の大量描画は InstancedMesh を基本とする」）。
 *
 * Phase 1 は行動状態を色で示す暫定表現。頭・胸・腹・脚・触角や形質の反映は
 * Phase 2 で行う。状態は個体詳細パネルに文字でも出るため、色だけに依存しない。
 */

/** 行動状態ごとの色。 */
const STATE_COLORS: Record<AntBehaviorState, Color> = {
  Explore: new Color('#3a2d24'),
  SeekFood: new Color('#7a5c2e'),
  Eat: new Color('#4f7a3a'),
  Rest: new Color('#4a4a58'),
  Reproduce: new Color('#8a4f7a'),
};

/** 選択中の個体を示す色。 */
const SELECTED_COLOR = new Color('#ff8f3f');

/** 使い回す一時オブジェクト。毎フレームの確保を避ける。 */
const dummy = new Object3D();
const matrix = new Matrix4();

interface AntInstancesProps {
  runtime: SimulationRuntime;
}

export function AntInstances({ runtime }: AntInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const selectAnt = useUiStore((state) => state.selectAnt);

  // 死亡で個体数は減るが増えはしないため、初期個体数ぶん確保しておく
  const capacity = INITIAL_ANT_COUNT;

  const dimensions = useMemo(
    () => [ANT_BASE_LENGTH, ANT_BASE_LENGTH * 0.45, ANT_BASE_LENGTH * 0.5] as const,
    [],
  );

  useLayoutEffect(() => {
    writeInstances(meshRef.current, runtime, capacity);
  }, [runtime, capacity]);

  useFrame(() => {
    const startedAt = performance.now();
    writeInstances(meshRef.current, runtime, capacity);
    runtime.addRenderMs(performance.now() - startedAt);
  }, FRAME_PRIORITY.render);

  /** クリックされたインスタンスから個体を特定する。 */
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    const index = event.instanceId;
    if (index === undefined) {
      return;
    }

    const ant = runtime.world.ants[index];
    if (ant) {
      event.stopPropagation();
      selectAnt(ant.id);
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, capacity]}
      frustumCulled={false}
      onClick={handleClick}
    >
      <boxGeometry args={dimensions} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}

/**
 * 全個体の変換行列と色を書き込む。
 * 死亡して空いたスロットは地面の下へ退避させ、描画も選択もされないようにする。
 */
function writeInstances(
  mesh: InstancedMesh | null,
  runtime: SimulationRuntime,
  capacity: number,
): void {
  if (!mesh) {
    return;
  }

  const { ants } = runtime.world;
  const selectedAntId = useUiStore.getState().selectedAntId;

  for (let i = 0; i < capacity; i += 1) {
    const ant = ants[i];

    if (!ant) {
      // 使われていないスロットは潰して見えなくする
      dummy.position.set(0, -1000, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      mesh.setMatrixAt(i, matrix);
      continue;
    }

    dummy.position.set(ant.position.x, ANT_BASE_LENGTH * 0.25, ant.position.z);
    // headingはXZ平面上の方位角。Three.jsのY軸回転とは符号が逆になる
    dummy.rotation.set(0, -ant.heading, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    matrix.copy(dummy.matrix);
    mesh.setMatrixAt(i, matrix);

    mesh.setColorAt(i, ant.id === selectedAntId ? SELECTED_COLOR : STATE_COLORS[ant.state]);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}
