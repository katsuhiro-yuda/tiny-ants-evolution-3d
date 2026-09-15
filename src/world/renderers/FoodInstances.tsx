import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Matrix4, Object3D } from 'three';
import type { InstancedMesh } from 'three';
import type { SimulationRuntime } from '../../state/simulationRuntime';
import { FRAME_PRIORITY } from './framePriority';

/**
 * 植物性餌の描画。
 * 残量に応じて大きさを変え、空の餌は消す。色だけでなくサイズでも量が分かる。
 */

const FOOD_COLOR = new Color('#5f8f3f');
const FOOD_BASE_SIZE = 0.75;

const dummy = new Object3D();
const matrix = new Matrix4();

interface FoodInstancesProps {
  runtime: SimulationRuntime;
}

export function FoodInstances({ runtime }: FoodInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const capacity = runtime.world.foods.length;

  useLayoutEffect(() => {
    writeInstances(meshRef.current, runtime);
  }, [runtime]);

  useFrame(() => {
    const startedAt = performance.now();
    writeInstances(meshRef.current, runtime);
    runtime.addRenderMs(performance.now() - startedAt);
  }, FRAME_PRIORITY.render);

  return (
    <instancedMesh args={[undefined, undefined, capacity]} ref={meshRef} frustumCulled={false}>
      <coneGeometry args={[FOOD_BASE_SIZE * 0.5, FOOD_BASE_SIZE, 5]} />
      <meshLambertMaterial color={FOOD_COLOR} />
    </instancedMesh>
  );
}

function writeInstances(mesh: InstancedMesh | null, runtime: SimulationRuntime): void {
  if (!mesh) {
    return;
  }

  const { foods } = runtime.world;

  for (let i = 0; i < foods.length; i += 1) {
    const food = foods[i];
    const fullness = food.capacity > 0 ? food.energy / food.capacity : 0;

    if (fullness <= 0) {
      dummy.scale.set(0, 0, 0);
      dummy.position.set(food.position.x, -1000, food.position.z);
    } else {
      // 残量が減るほど小さくする。最小でも見える大きさを残す
      const scale = 0.35 + fullness * 0.65;
      dummy.scale.set(scale, scale, scale);
      dummy.position.set(food.position.x, (FOOD_BASE_SIZE * scale) / 2, food.position.z);
    }

    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    matrix.copy(dummy.matrix);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}
