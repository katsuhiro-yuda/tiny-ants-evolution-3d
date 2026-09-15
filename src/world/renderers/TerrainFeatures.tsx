import type { TerrainFeature } from '../../simulation/resources/terrain';

/**
 * 水場と岩の描画（仕様書 §4, §11）。
 * 生成後に変化しないため、インスタンス更新は不要。
 */

const WATER_COLOR = '#5b93b5';
const ROCK_COLOR = '#8a8a84';

interface TerrainFeaturesProps {
  terrain: readonly TerrainFeature[];
}

export function TerrainFeatures({ terrain }: TerrainFeaturesProps) {
  return (
    <>
      {terrain.map((feature) =>
        feature.kind === 'water' ? (
          <mesh
            key={feature.id}
            position={[feature.position.x, 0.03, feature.position.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[feature.radius, 20]} />
            <meshLambertMaterial color={WATER_COLOR} />
          </mesh>
        ) : (
          // 岩は水場と形で区別できるよう、低いドームにする
          <mesh
            key={feature.id}
            position={[feature.position.x, 0, feature.position.z]}
            scale={[1, 0.55, 1]}
          >
            <dodecahedronGeometry args={[feature.radius, 0]} />
            <meshLambertMaterial color={ROCK_COLOR} flatShading />
          </mesh>
        ),
      )}
    </>
  );
}
