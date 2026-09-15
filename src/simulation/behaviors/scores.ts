import { createRandom } from '../engine/random';
import { FOOD_REACH } from '../config/resources';
import { HUNGER_THRESHOLD_RATIO, SATIATED_RATIO } from '../config/biology';
import type { AntBehaviorState, DecisionContext } from './types';

/**
 * 行動スコア（仕様書 §7「行動スコアを計算する」「最高スコアの行動を基本とする」）。
 *
 * 各関数は純粋関数で、DecisionContext の値だけから決まる。
 * Phase 3 で scoreHunt / scoreFlee を、Phase 4 で scoreReturnNest などを追加する。
 */

/** スコアのゆらぎ幅。大きすぎると行動が安定しない。 */
const NOISE_WEIGHT = 0.12;

/**
 * 繁殖のスコア。届く餌があるとき（Eat は1.8以上）はそちらを優先し、
 * 探索・休息よりは確実に上へ来る値にする。
 */
const REPRODUCE_SCORE = 1.5;

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
  const proximity = 1 - Math.min(1, context.distanceToFood / context.visionRange);

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

/**
 * 繁殖: 条件を満たしていれば選ぶ。
 * 条件（成熟・エネルギー・クールダウン）の判定は繁殖システム側が行う。
 */
export function scoreReproduce(context: DecisionContext): number {
  return context.canReproduce ? REPRODUCE_SCORE : 0;
}

/** 全行動のスコアを算出する。デバッグと個体詳細の表示にも使う。 */
export function scoreAll(context: DecisionContext): Record<AntBehaviorState, number> {
  return {
    Explore: scoreExplore(context),
    SeekFood: scoreSeekFood(context),
    Eat: scoreEat(context),
    Rest: scoreRest(context),
    Reproduce: scoreReproduce(context),
  };
}

/**
 * ゆらぎ用の乱数種。0〜1の noise を32bit整数へ広げる。
 *
 * mulberry32 は隣接する種でも十分に撹拌されるため、個体ごとに1つ引いた noise から
 * 行動ごとに独立した列を取り出せる。`Math.sin` などの場当たりなハッシュは使わない（仕様書 §12）。
 */
function noiseSeed(noise: number): number {
  const clamped = Math.min(1, Math.max(0, noise));
  return Math.round(clamped * 0xffffffff) >>> 0;
}

/**
 * 最高スコアの行動を選ぶ。小さなランダム性を加える（仕様書 §7）。
 * スコアが同点の場合は Explore 側へ寄せず、宣言順で安定させる。
 *
 * ゆらぎは「行動ごとに独立した値」でなければならない。
 * 全候補へ同じ値を一律加算すると、正のスコア同士の差が保たれたまま平行移動するだけで
 * 順位が一切変わらず、noise が意思決定へ影響しなくなるため。
 *
 * context.noise を種とした生成器から候補ごとに引き直すことで、
 * 同じ DecisionContext からは常に同じ行動が返る（決定性）ことも同時に満たす。
 */
export function decideBehavior(context: DecisionContext): AntBehaviorState {
  const scores = scoreAll(context);
  // 種が同じなら同じ列になる。候補数に依存しないため、Phase 3 で Hunt / Flee が増えても動く
  const jitterSource = createRandom(noiseSeed(context.noise));

  let best: AntBehaviorState = 'Explore';
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [state, score] of Object.entries(scores) as [AntBehaviorState, number][]) {
    // 引く回数を候補の成否で変えない。こうすると、ある行動へ割り当たるゆらぎが
    // 「他の行動が成立しているかどうか」に左右されず、宣言順だけで決まる
    const jitter = jitterSource.next() * NOISE_WEIGHT;

    // スコア0の行動は成立していない。ゆらぎは常に0以上なので、
    // 加算対象から外しておけば逆転して選ばれることはない
    const adjusted = score > 0 ? score + jitter : score;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      best = state;
    }
  }

  return best;
}
