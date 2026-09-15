import type { Food } from '../resources/food';

/**
 * 行動状態（仕様書 §7）。
 * Phase 2 で使うのは Explore / SeekFood / Eat / Rest / Reproduce の5つ。
 * Hunt / Flee / CarryFood / FollowPheromone / ReturnNest は後続Phaseで追加する。
 */
export type AntBehaviorState = 'Explore' | 'SeekFood' | 'Eat' | 'Rest' | 'Reproduce';

/**
 * 意思決定の入力。
 *
 * 視界内で見つかったものだけを渡す。視界外の対象を参照できない構造にすることで、
 * 仕様書 §7「視界外の対象位置を直接参照しない」を型で担保する。
 */
export interface DecisionContext {
  /** 0（空）〜1（満）で正規化したエネルギー。上限は個体ごとに異なる。 */
  energyRatio: number;
  /** 視界内で最も近い食べられる餌。なければ undefined。 */
  visibleFood: Food | undefined;
  /** visibleFood までの距離。餌がなければ undefined。 */
  distanceToFood: number | undefined;
  /** この個体の視界半径。餌の近さを正規化するために使う。 */
  visionRange: number;
  /** 成熟・エネルギー・クールダウンの条件を満たし、繁殖できる状態か。 */
  canReproduce: boolean;
  /** 0〜1の一様乱数。スコアへ小さなゆらぎを与えるために使う。 */
  noise: number;
}
