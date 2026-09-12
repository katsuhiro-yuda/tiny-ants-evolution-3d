/**
 * useFrame の実行順序。
 *
 * R3F は priority が 1 以上の useFrame が存在すると自動描画を止める。
 * そのため描画も明示的に行い、シミュレーション→インスタンス更新→描画の
 * 順序を固定して、各段階の所要時間を分離して計測できるようにする。
 */
export const FRAME_PRIORITY = {
  /** 固定タイムステップでシミュレーションを進める */
  simulation: 1,
  /** インスタンス行列を書き込む */
  render: 2,
  /** WebGLへ描画し、フレームの計測を確定する */
  present: 3,
} as const;
