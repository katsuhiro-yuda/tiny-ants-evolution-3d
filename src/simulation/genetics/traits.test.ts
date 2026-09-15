import { describe, expect, it } from 'vitest';
import {
  computeBasalMetabolism,
  computeDigestionEfficiency,
  computeEnergyCapacity,
  computeLifespan,
  computeMaturityAge,
  computeMaxSpeed,
  computeMovementCost,
  computeOffspringEnergy,
  computeReproductionCooldown,
  computeReproductionCost,
  computeReproductionThreshold,
  computeTurnRate,
  createDerivedTraits,
} from './traits';
import { LIFESPAN_MAX, LIFESPAN_MIN } from '../config/genetics';
import { uniformGenome } from '../../test/antFactory';
import type { Genome } from './genome';

/** 1つの形質だけを変えた Genome を作る。他形質の影響を排除して効果とコストを見る。 */
function withTrait(key: keyof Genome, value: number): Genome {
  return { ...uniformGenome(0.5), [key]: value };
}

const low = 0.1;
const high = 0.9;

describe('computeMaxSpeed', () => {
  it('speed が高いほど速い', () => {
    expect(computeMaxSpeed(withTrait('speed', high))).toBeGreaterThan(
      computeMaxSpeed(withTrait('speed', low)),
    );
  });

  it('重装甲化のコストとして速度が落ちる（仕様書 §6）', () => {
    expect(computeMaxSpeed(withTrait('armor', high))).toBeLessThan(
      computeMaxSpeed(withTrait('armor', low)),
    );
  });

  it('代謝効率を上げると瞬発性能が落ちる（仕様書 §5）', () => {
    expect(computeMaxSpeed(withTrait('metabolism', high))).toBeLessThan(
      computeMaxSpeed(withTrait('metabolism', low)),
    );
  });

  it('全形質が最大でも速度が負にならない', () => {
    expect(computeMaxSpeed(uniformGenome(1))).toBeGreaterThan(0);
  });
});

describe('computeTurnRate', () => {
  it('大型化のコストとして旋回が鈍る（仕様書 §6）', () => {
    expect(computeTurnRate(withTrait('bodySize', high))).toBeLessThan(
      computeTurnRate(withTrait('bodySize', low)),
    );
  });

  it('最大体格でも旋回できる', () => {
    expect(computeTurnRate(withTrait('bodySize', 1))).toBeGreaterThan(0);
  });
});

describe('computeBasalMetabolism', () => {
  it('大型化のコストとして基礎代謝が増える（仕様書 §6）', () => {
    expect(computeBasalMetabolism(withTrait('bodySize', high))).toBeGreaterThan(
      computeBasalMetabolism(withTrait('bodySize', low)),
    );
  });

  it('重装甲化のコストとして基礎代謝が増える（仕様書 §6）', () => {
    expect(computeBasalMetabolism(withTrait('armor', high))).toBeGreaterThan(
      computeBasalMetabolism(withTrait('armor', low)),
    );
  });

  it('視野拡大のコストとして感覚の消費が増える（仕様書 §6）', () => {
    expect(computeBasalMetabolism(withTrait('visionRange', high))).toBeGreaterThan(
      computeBasalMetabolism(withTrait('visionRange', low)),
    );
  });

  it('代謝効率が高いほど消費が減る', () => {
    expect(computeBasalMetabolism(withTrait('metabolism', high))).toBeLessThan(
      computeBasalMetabolism(withTrait('metabolism', low)),
    );
  });

  it('どの形質でも消費が0以下にならない', () => {
    expect(computeBasalMetabolism(uniformGenome(1))).toBeGreaterThan(0);
    expect(computeBasalMetabolism(uniformGenome(0))).toBeGreaterThan(0);
  });
});

describe('computeMovementCost', () => {
  it('高速化のコストとして移動単価が上がる（仕様書 §6）', () => {
    expect(computeMovementCost(withTrait('speed', high))).toBeGreaterThan(
      computeMovementCost(withTrait('speed', low)),
    );
  });

  it('速度を上げるほどコストの増え方が急になる', () => {
    const lowToMid =
      computeMovementCost(withTrait('speed', 0.5)) - computeMovementCost(withTrait('speed', 0.2));
    const midToHigh =
      computeMovementCost(withTrait('speed', 0.8)) - computeMovementCost(withTrait('speed', 0.5));

    expect(midToHigh).toBeGreaterThan(lowToMid);
  });

  it('大型・重装甲ほど1歩が高くつく', () => {
    expect(computeMovementCost(withTrait('bodySize', high))).toBeGreaterThan(
      computeMovementCost(withTrait('bodySize', low)),
    );
    expect(computeMovementCost(withTrait('armor', high))).toBeGreaterThan(
      computeMovementCost(withTrait('armor', low)),
    );
  });
});

describe('computeEnergyCapacity', () => {
  it('大型ほど多く蓄えられる（仕様書 §5）', () => {
    expect(computeEnergyCapacity(withTrait('bodySize', high))).toBeGreaterThan(
      computeEnergyCapacity(withTrait('bodySize', low)),
    );
  });
});

describe('computeLifespan', () => {
  it('longevity が高いほど長生きする', () => {
    expect(computeLifespan(withTrait('longevity', high))).toBeGreaterThan(
      computeLifespan(withTrait('longevity', low)),
    );
  });

  it('設定範囲を超えない', () => {
    expect(computeLifespan(withTrait('longevity', 0))).toBeCloseTo(LIFESPAN_MIN, 10);
    expect(computeLifespan(withTrait('longevity', 1))).toBeCloseTo(LIFESPAN_MAX, 10);
  });
});

describe('computeMaturityAge', () => {
  it('長寿命のコストとして成熟が遅くなる（仕様書 §6）', () => {
    expect(computeMaturityAge(withTrait('longevity', high))).toBeGreaterThan(
      computeMaturityAge(withTrait('longevity', low)),
    );
  });

  it('寿命より先に成熟する', () => {
    for (const value of [0, 0.25, 0.5, 0.75, 1]) {
      const genome = withTrait('longevity', value);
      expect(computeMaturityAge(genome)).toBeLessThan(computeLifespan(genome));
    }
  });
});

describe('computeDigestionEfficiency', () => {
  it('植物へ特化するほど植物からの栄養が増える', () => {
    expect(computeDigestionEfficiency(withTrait('plantDigestion', high), 'plant')).toBeGreaterThan(
      computeDigestionEfficiency(withTrait('plantDigestion', low), 'plant'),
    );
  });

  it('肉食特化のコストとして植物からの栄養が落ちる（仕様書 §6）', () => {
    expect(computeDigestionEfficiency(withTrait('meatDigestion', high), 'plant')).toBeLessThan(
      computeDigestionEfficiency(withTrait('meatDigestion', low), 'plant'),
    );
  });

  it('草食特化のコストとして肉からの栄養が落ちる（仕様書 §6）', () => {
    expect(computeDigestionEfficiency(withTrait('plantDigestion', high), 'meat')).toBeLessThan(
      computeDigestionEfficiency(withTrait('plantDigestion', low), 'meat'),
    );
  });

  it('効率は0より大きく1以下に収まる', () => {
    for (const value of [0, 0.5, 1]) {
      const genome = uniformGenome(value);
      const plant = computeDigestionEfficiency(genome, 'plant');

      expect(plant).toBeGreaterThan(0);
      expect(plant).toBeLessThanOrEqual(1);
    }
  });

  it('両方に特化しても片方特化には及ばない（両立コスト）', () => {
    const both = computeDigestionEfficiency(uniformGenome(1), 'plant');
    const plantOnly = computeDigestionEfficiency(
      { ...uniformGenome(0.5), plantDigestion: 1, meatDigestion: 0 },
      'plant',
    );

    expect(both).toBeLessThan(plantOnly);
  });
});

describe('繁殖のコスト', () => {
  it('繁殖には蓄積の大半が必要になる', () => {
    const genome = uniformGenome(0.5);

    expect(computeReproductionThreshold(genome)).toBeLessThan(computeEnergyCapacity(genome));
    expect(computeReproductionCost(genome)).toBeGreaterThan(0);
    expect(computeReproductionCost(genome)).toBeLessThan(computeReproductionThreshold(genome));
  });

  it('高繁殖力のコストとして子の初期エネルギーが下がる（仕様書 §6）', () => {
    const fertile = withTrait('fertility', high);
    const infertile = withTrait('fertility', low);

    expect(computeOffspringEnergy(fertile, fertile)).toBeLessThan(
      computeOffspringEnergy(infertile, infertile),
    );
  });

  it('繁殖力が高いほど次の繁殖までが短い', () => {
    expect(computeReproductionCooldown(withTrait('fertility', high))).toBeLessThan(
      computeReproductionCooldown(withTrait('fertility', low)),
    );
  });

  it('子へ渡るエネルギーは親が支払う量を超えない', () => {
    const genome = uniformGenome(0.5);

    expect(computeOffspringEnergy(genome, genome)).toBeLessThan(computeReproductionCost(genome));
  });

  it('子の器を超えるエネルギーは渡らない', () => {
    // 大型の親から小型の子が生まれた場合
    const parent = withTrait('bodySize', 1);
    const child = withTrait('bodySize', 0);

    expect(computeOffspringEnergy(parent, child)).toBeLessThanOrEqual(computeEnergyCapacity(child));
  });
});

describe('createDerivedTraits', () => {
  it('個別の計算結果と一致する', () => {
    const genome = uniformGenome(0.37);
    const traits = createDerivedTraits(genome);

    expect(traits.maxSpeed).toBe(computeMaxSpeed(genome));
    expect(traits.basalMetabolism).toBe(computeBasalMetabolism(genome));
    expect(traits.energyCapacity).toBe(computeEnergyCapacity(genome));
    expect(traits.maturityAge).toBe(computeMaturityAge(genome));
    expect(traits.plantEfficiency).toBe(computeDigestionEfficiency(genome, 'plant'));
  });

  it('全ての能力値が有限の正の数になる', () => {
    for (const value of [0, 0.5, 1]) {
      for (const [name, derived] of Object.entries(createDerivedTraits(uniformGenome(value)))) {
        expect(Number.isFinite(derived), name).toBe(true);
        expect(derived, name).toBeGreaterThan(0);
      }
    }
  });
});
