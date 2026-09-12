import { FOOD_REACH } from '../config/resources';
import { HUNGER_THRESHOLD_RATIO, SATIATED_RATIO, VISION_RANGE } from '../config/biology';
import type { AntBehaviorState, DecisionContext } from './types';

/**
 * 行動スコア（仕様書 §7「行動スコアを計算する」「最高スコアの行動を基本とする」）。
 *
 * 各関数は純粋関数で、DecisionContext の値だけから決まる。
 * Phase 3 で scoreHunt / scoreFlee を、Phase 4 で scoreReturnNest などを追加する。
 */

/** スコアのゆらぎ幅。大きすぎると行動が安定しない。 */
const NOISE_WEIGHT = 0.12;

/** 空腹度（0=満腹, 1=空腹）。 */
export function hungerOf(energyRatio: number): number {
  if (energyRatio >= HUNGER_THRESHOLD_RATIO) {
    return 0;
  }
  return (HUNGER_THRESHOLD_RATIO - energyRatio) / HUNGER_THRESHOLD_RATIO;
}

/** 探索: 常に一定の基礎スコアを持ち、他が選ばれないときの既定になる。 */
export function scoreExplore(context: DecisionContext): number {
  // 空腹でも餌が見えないなら、探索し続けるしかない
  const desperation = context.visibleFood ? 0 : hungerOf(context.energyRatio) * 0.4;
  return 0.3 + desperation;
}

/** 採食への接近: 餌が見えていて空腹なほど高い。遠いほど魅力が下がる。 */
export function scoreSeekFood(context: DecisionContext): number {
  if (!context.visibleFood || context.distanceToFood === undefined) {
    return 0;
  }

  const hunger = hungerOf(context.energyRatio);
  const proximity = 1 - Math.min(1, context.distanceToFood / VISION_RANGE);

  // 満腹でも近くに餌があれば多少は寄る
  return hunger * 1.4 + proximity * 0.35;
}

/** 採食: 餌に届く距離にいて、まだ満腹でないときだけ成立する。 */
export function scoreEat(context: DecisionContext): number {
  if (
    !context.visibleFood ||
    context.distanceToFood === undefined ||
    context.distanceToFood > FOOD_REACH
  ) {
    return 0;
  }

  if (context.energyRatio >= 1) {
    return 0;
  }

  // 届いているなら最優先。移動コストをかけずに回復できる
  return 1.8 + hungerOf(context.energyRatio);
}

/** 休息: 満腹に近いほど選びやすい。基礎代謝が軽減される。 */
export function scoreRest(context: DecisionContext): number {
  if (context.energyRatio < SATIATED_RATIO) {
    return 0;
  }

  const surplus = (context.energyRatio - SATIATED_RATIO) / (1 - SATIATED_RATIO);
  return 0.35 + surplus * 0.5;
}

/** 全行動のスコアを算出する。デバッグと個体詳細の表示にも使う。 */
export function scoreAll(context: DecisionContext): Record<AntBehaviorState, number> {
  return {
    Explore: scoreExplore(context),
    SeekFood: scoreSeekFood(context),
    Eat: scoreEat(context),
    Rest: scoreRest(context),
  };
}

/**
 * 最高スコアの行動を選ぶ。小さなランダム性を加える（仕様書 §7）。
 * スコアが同点の場合は Explore 側へ寄せず、宣言順で安定させる。
 */
export function decideBehavior(context: DecisionContext): AntBehaviorState {
  const scores = scoreAll(context);
  const noise = context.noise * NOISE_WEIGHT;

  let best: AntBehaviorState = 'Explore';
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [state, score] of Object.entries(scores) as [AntBehaviorState, number][]) {
    // スコア0の行動は成立していないため、ゆらぎで選ばれないようにする
    const adjusted = score > 0 ? score + noise : score;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      best = state;
    }
  }

  return best;
}
