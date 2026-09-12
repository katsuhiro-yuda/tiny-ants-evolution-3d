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
});

describe('視界外を参照しない構造', () => {
  it('DecisionContext は視界内の餌しか持たない', () => {
    // 型レベルの制約を実行時にも確認する。
    // 視界外の餌を渡す手段がないため、意思決定は視界内の情報だけで完結する
    const keys = Object.keys(context()).sort();

    expect(keys).toEqual(['distanceToFood', 'energyRatio', 'noise', 'visibleFood']);
  });
});
