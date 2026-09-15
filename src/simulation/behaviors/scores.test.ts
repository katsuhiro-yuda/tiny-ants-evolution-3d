import { describe, expect, it } from 'vitest';
import {
  decideBehavior,
  hungerOf,
  scoreAll,
  scoreEat,
  scoreExplore,
  scoreRest,
  scoreSeekFood,
} from './scores';
import type { DecisionContext } from './types';
import type { Food } from '../resources/food';
import { FOOD_REACH } from '../config/resources';
import { HUNGER_THRESHOLD_RATIO, SATIATED_RATIO, VISION_RANGE } from '../config/biology';

const food: Food = {
  id: 'food-1',
  position: { x: 0, y: 0, z: 0 },
  energy: 20,
  capacity: 20,
  regrowthDelayRemaining: 0,
  regrowthRate: 1,
};

function context(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    energyRatio: 0.5,
    visibleFood: undefined,
    distanceToFood: undefined,
    noise: 0,
    ...overrides,
  };
}

describe('hungerOf', () => {
  it('閾値以上なら空腹ではない', () => {
    expect(hungerOf(HUNGER_THRESHOLD_RATIO)).toBe(0);
    expect(hungerOf(1)).toBe(0);
  });

  it('エネルギーが減るほど空腹度が上がる', () => {
    expect(hungerOf(0.1)).toBeGreaterThan(hungerOf(0.4));
  });

  it('エネルギー0で最大になる', () => {
    expect(hungerOf(0)).toBeCloseTo(1, 10);
  });
});

describe('scoreExplore', () => {
  it('常に正のスコアを持ち、既定の行動になる', () => {
    expect(scoreExplore(context())).toBeGreaterThan(0);
  });

  it('空腹で餌が見えないときほど高くなる', () => {
    const hungry = scoreExplore(context({ energyRatio: 0.05 }));
    const full = scoreExplore(context({ energyRatio: 1 }));

    expect(hungry).toBeGreaterThan(full);
  });

  it('餌が見えていれば焦りぶんは加算されない', () => {
    const withFood = scoreExplore(
      context({ energyRatio: 0.05, visibleFood: food, distanceToFood: 5 }),
    );
    const withoutFood = scoreExplore(context({ energyRatio: 0.05 }));

    expect(withFood).toBeLessThan(withoutFood);
  });
});

describe('scoreSeekFood', () => {
  it('餌が見えなければ0', () => {
    expect(scoreSeekFood(context())).toBe(0);
  });

  it('空腹なほど高くなる', () => {
    const hungry = scoreSeekFood(
      context({ energyRatio: 0.1, visibleFood: food, distanceToFood: 5 }),
    );
    const full = scoreSeekFood(context({ energyRatio: 1, visibleFood: food, distanceToFood: 5 }));

    expect(hungry).toBeGreaterThan(full);
  });

  it('近い餌のほうが高くなる', () => {
    const near = scoreSeekFood(context({ energyRatio: 0.3, visibleFood: food, distanceToFood: 1 }));
    const far = scoreSeekFood(
      context({ energyRatio: 0.3, visibleFood: food, distanceToFood: VISION_RANGE }),
    );

    expect(near).toBeGreaterThan(far);
  });
});

describe('scoreEat', () => {
  it('届く距離なら最も高いスコアになる', () => {
    const ctx = context({ energyRatio: 0.3, visibleFood: food, distanceToFood: FOOD_REACH * 0.5 });
    const scores = scoreAll(ctx);

    expect(scores.Eat).toBeGreaterThan(scores.SeekFood);
    expect(scores.Eat).toBeGreaterThan(scores.Explore);
  });

  it('届かない距離なら0', () => {
    expect(
      scoreEat(context({ energyRatio: 0.3, visibleFood: food, distanceToFood: FOOD_REACH + 0.1 })),
    ).toBe(0);
  });

  it('満タンなら食べない', () => {
    expect(scoreEat(context({ energyRatio: 1, visibleFood: food, distanceToFood: 0.1 }))).toBe(0);
  });

  it('餌が見えなければ0', () => {
    expect(scoreEat(context({ energyRatio: 0.1 }))).toBe(0);
  });
});

describe('scoreRest', () => {
  it('満腹に近くなければ0', () => {
    expect(scoreRest(context({ energyRatio: SATIATED_RATIO - 0.01 }))).toBe(0);
  });

  it('余裕があるほど高くなる', () => {
    expect(scoreRest(context({ energyRatio: 1 }))).toBeGreaterThan(
      scoreRest(context({ energyRatio: SATIATED_RATIO + 0.01 })),
    );
  });
});

describe('decideBehavior', () => {
  it('餌が見えず空腹なら探索する', () => {
    expect(decideBehavior(context({ energyRatio: 0.2 }))).toBe('Explore');
  });

  it('餌が見えて空腹なら近づく', () => {
    expect(
      decideBehavior(context({ energyRatio: 0.2, visibleFood: food, distanceToFood: 6 })),
    ).toBe('SeekFood');
  });

  it('餌に届いていれば食べる', () => {
    expect(
      decideBehavior(context({ energyRatio: 0.2, visibleFood: food, distanceToFood: 0.3 })),
    ).toBe('Eat');
  });

  it('満腹なら休息する', () => {
    expect(decideBehavior(context({ energyRatio: 1 }))).toBe('Rest');
  });

  it('ランダム性が成立していない行動を選ばせない', () => {
    // 満腹・餌なしでは Eat / SeekFood のスコアが0。noise を最大にしても選ばれてはならない
    for (let i = 0; i <= 10; i += 1) {
      const chosen = decideBehavior(context({ energyRatio: 1, noise: i / 10 }));
      expect(['Rest', 'Explore']).toContain(chosen);
    }
  });

  it('同じ入力からは同じ行動を返す（決定的）', () => {
    const ctx = context({ energyRatio: 0.4, visibleFood: food, distanceToFood: 3, noise: 0.7 });

    expect(decideBehavior(ctx)).toBe(decideBehavior(ctx));
  });

  it('noise を変えると選ばれる行動が変わる', () => {
    // ゆらぎを全候補へ一律加算していると正のスコア同士の順位が変わらないため、
    // 結果は必ず1種類になる。この欠陥があればこのテストは落ちる
    const chosen = new Set<string>();
    for (let i = 0; i <= 100; i += 1) {
      chosen.add(decideBehavior(context({ energyRatio: SATIATED_RATIO, noise: i / 100 })));
    }

    expect(chosen.size).toBeGreaterThan(1);
  });

  it('拮抗する Explore と Rest はどちらも選ばれうる', () => {
    // energyRatio = SATIATED_RATIO では Rest(0.35) と Explore(0.3) の差が NOISE_WEIGHT 未満になる
    const scores = scoreAll(context({ energyRatio: SATIATED_RATIO }));
    expect(scores.Rest).toBeGreaterThan(0);
    expect(scores.Explore).toBeGreaterThan(0);

    const counts = { Explore: 0, Rest: 0 };
    for (let i = 0; i <= 200; i += 1) {
      const chosen = decideBehavior(context({ energyRatio: SATIATED_RATIO, noise: i / 200 }));
      expect(['Explore', 'Rest']).toContain(chosen);
      counts[chosen as 'Explore' | 'Rest'] += 1;
    }

    expect(counts.Explore).toBeGreaterThan(0);
    expect(counts.Rest).toBeGreaterThan(0);
  });

  it('スコア差が大きければ noise では逆転しない', () => {
    // ゆらぎ幅を超える差は保たれること。ランダム性が強すぎないことの担保
    for (let i = 0; i <= 100; i += 1) {
      const chosen = decideBehavior(
        context({ energyRatio: 0.2, visibleFood: food, distanceToFood: 0.3, noise: i / 100 }),
      );
      expect(chosen).toBe('Eat');
    }
  });

  it('スコア0の行動は noise をどう変えても選ばれない', () => {
    // 餌が見えないので SeekFood / Eat は常にスコア0。満腹でないので Rest も0
    for (let i = 0; i <= 100; i += 1) {
      const ctx = context({ energyRatio: 0.5, noise: i / 100 });
      const scores = scoreAll(ctx);

      expect(scores.SeekFood).toBe(0);
      expect(scores.Eat).toBe(0);
      expect(scores.Rest).toBe(0);
      expect(decideBehavior(ctx)).toBe('Explore');
    }
  });

  it('同じ noise からは毎回同じ行動を返す（拮抗する状況でも決定的）', () => {
    for (let i = 0; i <= 50; i += 1) {
      const noise = i / 50;
      const first = decideBehavior(context({ energyRatio: SATIATED_RATIO, noise }));
      const second = decideBehavior(context({ energyRatio: SATIATED_RATIO, noise }));

      expect(second).toBe(first);
    }
  });
});

describe('視界外を参照しない構造', () => {
  it('DecisionContext は視界内の餌しか持たない', () => {
    // 型レベルの制約を実行時にも確認する。
    // 視界外の餌を渡す手段がないため、意思決定は視界内の情報だけで完結する
    const keys = Object.keys(context()).sort();

    expect(keys).toEqual(['distanceToFood', 'energyRatio', 'noise', 'visibleFood']);
  });
});
