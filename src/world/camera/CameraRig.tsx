import { OrbitControls } from '@react-three/drei';
import { FIELD_SIZE } from '../../simulation/config/world';

/**
 * 斜め上視点のカメラ操作（仕様書 §9）。
 *
 * ドラッグで回転、ホイールでズーム、右ドラッグで平行移動。
 * 選択個体の追跡（仕様書 §9）は未実装。コロニー追跡と共通の仕組みになるため Phase 4 で追加する。
 */
export function CameraRig() {
  return (
    <OrbitControls
      makeDefault
      // 地面より下へ回り込ませない
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={0.15}
      minDistance={5}
      maxDistance={FIELD_SIZE * 1.6}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
