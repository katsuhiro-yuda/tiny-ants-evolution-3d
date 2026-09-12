import type { AntId, LineageId, Vec3 } from '../types';

/**
 * Phase 0時点の蟻。
 *
 * 仕様書 §5 の `AntEntity` の部分集合であり、固定タイムステップと
 * シード決定性の検証に必要な最小構成のみを持つ。
 * Genome・energy・state などはPhase 1以降で追加する。
 */
export interface Ant {
  id: AntId;
  lineageId: LineageId;
  generation: number;
  position: Vec3;
  velocity: Vec3;
  /** 描画の向き算出に使う進行方位（ラジアン）。 */
  heading: number;
}
