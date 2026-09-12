import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Matrix4, Object3D } from 'three';
import type { InstancedMesh } from 'three';
import { ANT_BASE_LENGTH } from '../../simulation/config/world';
import type { SimulationRuntime } from '../../state/simulationRuntime';
import { FRAME_PRIORITY } from './framePriority';

/**
 * 蟻の一括描画（仕様書 §11「蟻の大量描画は InstancedMesh を基本とする」）。
 *
 * Phase 0は形状・色とも単純な暫定表現。
 * 頭・胸・腹・脚・触角や形質の反映はPhase 2で行う。
 */

const ANT_COLOR = new Color('#3a2d24');

/** 使い回す一時オブジェクト。毎フレームの確保を避ける。 */
const dummy = new Object3D();
const matrix = new Matrix4();

interface AntInstancesProps {
  runtime: SimulationRuntime;
}

export function AntInstances({ runtime }: AntInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const count = runtime.world.ants.length;

  // Phase 0の暫定形状。胴体1つぶんの直方体で向きだけ分かるようにする
  const dimensions = useMemo(
    () => [ANT_BASE_LENGTH, ANT_BASE_LENGTH * 0.45, ANT_BASE_LENGTH * 0.5] as const,
    [],
  );

  // 初期姿勢を1度だけ書き込み、初回フレーム前から正しい位置で表示する
  useLayoutEffect(() => {
    writeInstanceMatrices(meshRef.current, runtime);
  }, [runtime]);

  useFrame(() => {
    const startedAt = performance.now();
    writeInstanceMatrices(meshRef.current, runtime);
    runtime.addRenderMs(performance.now() - startedAt);
  }, FRAME_PRIORITY.render);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      // 色だけで状態を伝えないため、Phase 1以降で形状・ラベルも併用する
    >
      <boxGeometry args={dimensions} />
      <meshLambertMaterial color={ANT_COLOR} />
    </instancedMesh>
  );
}

/** 全個体の変換行列を書き込む。1個体あたりの確保をゼロに保つ。 */
function writeInstanceMatrices(mesh: InstancedMesh | null, runtime: SimulationRuntime): void {
  if (!mesh) {
    return;
  }

  const { ants } = runtime.world;
  for (let i = 0; i < ants.length; i += 1) {
    const ant = ants[i];
    dummy.position.set(ant.position.x, ANT_BASE_LENGTH * 0.25, ant.position.z);
    // headingはXZ平面上の方位角。Three.jsのY軸回転とは符号が逆になる
    dummy.rotation.set(0, -ant.heading, 0);
    dummy.updateMatrix();
    matrix.copy(dummy.matrix);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}
