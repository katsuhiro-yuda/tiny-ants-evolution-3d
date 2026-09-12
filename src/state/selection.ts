import type { Ant } from '../simulation/entities/ant';

/**
 * 選択の移動（仕様書 §13「UI操作をキーボードで選択できる」）。
 *
 * 個体は死亡で配列から消えるため、選択中のIDが見つからない場合は
 * 先頭へ戻す。純粋関数としてUIから切り離し、単体テスト可能にする。
 */
export function nextAntId(
  ants: readonly Ant[],
  currentId: string | undefined,
  direction: 1 | -1,
): string | undefined {
  if (ants.length === 0) {
    return undefined;
  }

  const currentIndex = currentId ? ants.findIndex((ant) => ant.id === currentId) : -1;

  // 未選択、または選択個体が死亡している場合は端から始める
  if (currentIndex === -1) {
    return direction === 1 ? ants[0].id : ants[ants.length - 1].id;
  }

  const nextIndex = (currentIndex + direction + ants.length) % ants.length;
  return ants[nextIndex].id;
}
