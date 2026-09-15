import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { FIELD_HALF, FIELD_SIZE } from '../../simulation/config/world';

/**
 * 地形とライティング（仕様書 §11「温かみのあるローポリ・ジオラマ調」）。
 * 水場・岩は TerrainFeatures、植物性餌は FoodInstances が描画する。ここは地面と光だけを持つ。
 */

const GROUND_COLOR = '#c8b28a';
const BORDER_COLOR = '#8d7a56';
const GRID_COLOR = '#b09b76';

/** フィールド外周を示す閉じた四角形。 */
function useBorderGeometry(): BufferGeometry {
  return useMemo(() => {
    const h = FIELD_HALF;
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([-h, 0, -h, h, 0, -h, h, 0, h, -h, 0, h], 3),
    );
    return geometry;
  }, []);
}

export function WorldScene() {
  const borderGeometry = useBorderGeometry();

  return (
    <>
      <hemisphereLight args={['#fff4e0', '#6b5a3e', 1.1]} />
      <directionalLight position={[40, 60, 25]} intensity={1.5} />

      {/* 地面。XZ平面へ寝かせる */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FIELD_SIZE, FIELD_SIZE]} />
        <meshLambertMaterial color={GROUND_COLOR} />
      </mesh>

      {/* 距離感を掴むための補助グリッド */}
      <gridHelper args={[FIELD_SIZE, 20, GRID_COLOR, GRID_COLOR]} position={[0, 0.01, 0]} />

      {/* 蟻が越えられない境界 */}
      <lineLoop geometry={borderGeometry} position={[0, 0.02, 0]}>
        <lineBasicMaterial color={BORDER_COLOR} />
      </lineLoop>
    </>
  );
}
