import { useLayoutEffect, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Color, Matrix4, Object3D } from 'three';
import type { InstancedMesh } from 'three';
import { ANT_BASE_LENGTH } from '../../simulation/config/world';
import { MAX_POPULATION } from '../../simulation/config/genetics';
import type { Ant } from '../../simulation/entities/ant';
import type { SimulationRuntime } from '../../state/simulationRuntime';
import { useUiStore } from '../../state/uiStore';
import { FRAME_PRIORITY } from './framePriority';

/**
 * 蟻の一括描画（仕様書 §11「蟻の大量描画は InstancedMesh を基本とする」）。
 *
 * 胸・頭・腹の3部位をそれぞれ InstancedMesh で描き、体格・速度・装甲・視野・
 * 繁殖力を形とサイズへ、食性と寿命を色へ反映する（仕様書 §5 の「見た目」列）。
 * 脚と触角は形状が細かく、500匹規模では描画コストに見合わないため持たせていない。
 *
 * 色だけで判断させないため、形質は個体詳細パネルに数値とラベルでも出る（仕様書 §13）。
 */

/** 体の基本色。明度は longevity で変える。 */
const BODY_HUE = new Color('#4a3524');

/** 腹の色。食性（植物消化 - 肉消化）で緑と赤の間を補間する。 */
const HERBIVORE_COLOR = new Color('#5f7a35');
const CARNIVORE_COLOR = new Color('#8f3b30');

/** 選択中の個体を示す色。 */
const SELECTED_COLOR = new Color('#ff8f3f');

/** 使い回す一時オブジェクト。毎フレームの確保を避ける。 */
const dummy = new Object3D();
const matrix = new Matrix4();
const color = new Color();

/** 体の各部位の基準寸法（ANT_BASE_LENGTH に対する比率）。 */
const THORAX_LENGTH = 0.4;
const THORAX_WIDTH = 0.24;
const HEAD_RADIUS = 0.19;
const ABDOMEN_RADIUS = 0.25;

/** 胸の中心から見た頭と腹の距離（ANT_BASE_LENGTH に対する比率）。前が正。 */
const HEAD_OFFSET = 0.4;
const ABDOMEN_OFFSET = -0.46;

interface AntInstancesProps {
  runtime: SimulationRuntime;
}

export function AntInstances({ runtime }: AntInstancesProps) {
  const thoraxRef = useRef<InstancedMesh>(null);
  const headRef = useRef<InstancedMesh>(null);
  const abdomenRef = useRef<InstancedMesh>(null);
  /**
   * 前フレームで書き込んだスロット数。
   * 毎フレーム容量ぶん（上限500×3部位）を走査すると、個体が少ない間も最大の
   * コストがかかる。生存している個体ぶんだけ書き、減った差分だけを隠す。
   */
  const writtenCount = useRef(0);
  const selectAnt = useUiStore((state) => state.selectAnt);

  // 繁殖で個体数が増えるため、シミュレーション側の上限ぶん確保する。
  // InstancedMesh は生成時にインスタンス数が決まり、後から増やせない
  const capacity = MAX_POPULATION;

  useLayoutEffect(() => {
    writtenCount.current = writeAll(
      thoraxRef.current,
      headRef.current,
      abdomenRef.current,
      runtime,
      capacity,
      writtenCount.current,
    );
  }, [runtime, capacity]);

  useFrame(() => {
    const startedAt = performance.now();
    writtenCount.current = writeAll(
      thoraxRef.current,
      headRef.current,
      abdomenRef.current,
      runtime,
      capacity,
      writtenCount.current,
    );
    runtime.addRenderMs(performance.now() - startedAt);
  }, FRAME_PRIORITY.render);

  /** クリックされたインスタンスから個体を特定する。どの部位を押しても同じ個体を選ぶ。 */
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
    <group>
      <instancedMesh
        ref={thoraxRef}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        onClick={handleClick}
      >
        {/* 寸法はインスタンスごとのスケールで与えるため、ここでは単位サイズにする */}
        <boxGeometry args={[ANT_BASE_LENGTH, ANT_BASE_LENGTH, ANT_BASE_LENGTH]} />
        <meshLambertMaterial />
      </instancedMesh>

      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        onClick={handleClick}
      >
        {/* ローポリ・ジオラマ調に合わせ、分割数は最小限に抑える（仕様書 §11） */}
        <sphereGeometry args={[ANT_BASE_LENGTH, 8, 6]} />
        <meshLambertMaterial />
      </instancedMesh>

      <instancedMesh
        ref={abdomenRef}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        onClick={handleClick}
      >
        <sphereGeometry args={[ANT_BASE_LENGTH, 8, 6]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}

/**
 * 全個体の変換行列と色を3部位ぶん書き込み、書き込んだスロット数を返す。
 *
 * 前フレームより個体が減った場合だけ、空いたスロットを潰して見えなくする。
 * 容量ぶんを常に走査すると、100匹のときも500匹ぶんの行列計算を行うことになる。
 */
function writeAll(
  thorax: InstancedMesh | null,
  head: InstancedMesh | null,
  abdomen: InstancedMesh | null,
  runtime: SimulationRuntime,
  capacity: number,
  previousCount: number,
): number {
  if (!thorax || !head || !abdomen) {
    return previousCount;
  }

  const { ants } = runtime.world;
  const selectedAntId = useUiStore.getState().selectedAntId;
  // 上限を超えた個体は描画しない。シミュレーション側も同じ上限で繁殖を止めている
  const visibleCount = Math.min(ants.length, capacity);

  for (let i = 0; i < visibleCount; i += 1) {
    const ant = ants[i];
    const selected = ant.id === selectedAntId;
    // 体格は全身の大きさに効く（仕様書 §5「bodySize: 全身サイズ」）
    const scale = 0.75 + ant.genome.bodySize * 0.6;

    writeThorax(thorax, i, ant, scale, selected);
    writeHead(head, i, ant, scale, selected);
    writeAbdomen(abdomen, i, ant, scale, selected);
  }

  for (let i = visibleCount; i < previousCount; i += 1) {
    hideInstance(thorax, i);
    hideInstance(head, i);
    hideInstance(abdomen, i);
  }

  for (const mesh of [thorax, head, abdomen]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  return visibleCount;
}

/** 胸。速いほど細長く、装甲が厚いほど胴が太くなる。 */
function writeThorax(
  mesh: InstancedMesh,
  index: number,
  ant: Ant,
  scale: number,
  selected: boolean,
): void {
  const length = THORAX_LENGTH * (1 + ant.genome.speed * 0.4) * scale;
  const width = THORAX_WIDTH * (0.8 + ant.genome.armor * 0.7) * scale;
  const height = THORAX_WIDTH * (0.75 + ant.genome.armor * 0.6) * scale;

  placeInstance(mesh, index, ant, 0, height * 0.5, length, height, width);
  mesh.setColorAt(index, selected ? SELECTED_COLOR : bodyColor(ant));
}

/** 頭。視野が広いほど大きい（目と触角の代わり）。 */
function writeHead(
  mesh: InstancedMesh,
  index: number,
  ant: Ant,
  scale: number,
  selected: boolean,
): void {
  const radius = HEAD_RADIUS * (0.85 + ant.genome.visionRange * 0.45) * scale;

  placeInstance(mesh, index, ant, HEAD_OFFSET * scale, radius, radius, radius, radius);
  mesh.setColorAt(index, selected ? SELECTED_COLOR : bodyColor(ant, 0.85));
}

/** 腹。繁殖力が高いほど大きく、食性で色が変わる（仕様書 §5「fertility: 腹部形状」）。 */
function writeAbdomen(
  mesh: InstancedMesh,
  index: number,
  ant: Ant,
  scale: number,
  selected: boolean,
): void {
  const radius = ABDOMEN_RADIUS * (0.85 + ant.genome.fertility * 0.5) * scale;

  placeInstance(mesh, index, ant, ABDOMEN_OFFSET * scale, radius, radius * 1.25, radius, radius);
  mesh.setColorAt(index, selected ? SELECTED_COLOR : dietColor(ant));
}

/**
 * 1部位を配置する。
 * forwardOffset は進行方向への距離（前が正）で、頭が前、腹が後ろになる。
 */
function placeInstance(
  mesh: InstancedMesh,
  index: number,
  ant: Ant,
  forwardOffset: number,
  y: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void {
  const forwardX = Math.cos(ant.heading) * forwardOffset * ANT_BASE_LENGTH;
  const forwardZ = Math.sin(ant.heading) * forwardOffset * ANT_BASE_LENGTH;

  dummy.position.set(ant.position.x + forwardX, y * ANT_BASE_LENGTH, ant.position.z + forwardZ);
  // headingはXZ平面上の方位角。Three.jsのY軸回転とは符号が逆になる
  dummy.rotation.set(0, -ant.heading, 0);
  dummy.scale.set(scaleX, scaleY, scaleZ);
  dummy.updateMatrix();
  matrix.copy(dummy.matrix);
  mesh.setMatrixAt(index, matrix);
}

/** 使われていないスロットを潰して見えなくする。 */
function hideInstance(mesh: InstancedMesh, index: number): void {
  dummy.position.set(0, -1000, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  matrix.copy(dummy.matrix);
  mesh.setMatrixAt(index, matrix);
}

/** 体色。寿命が長い個体ほど明るい（仕様書 §5「longevity: 明度」）。 */
function bodyColor(ant: Ant, multiplier = 1): Color {
  color.copy(BODY_HUE);
  return color.multiplyScalar((0.75 + ant.genome.longevity * 0.55) * multiplier);
}

/** 差し色。植物消化と肉消化の差で緑と赤の間を補間する（仕様書 §5, §11）。 */
function dietColor(ant: Ant): Color {
  // -1（完全な肉食）〜1（完全な草食）を 0〜1 へ写す
  const balance = (ant.genome.plantDigestion - ant.genome.meatDigestion + 1) / 2;

  color.copy(CARNIVORE_COLOR);
  return color.lerp(HERBIVORE_COLOR, balance);
}
