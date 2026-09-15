import { createRandom } from '../simulation/engine/random';
import { createAnt, type Ant } from '../simulation/entities/ant';
import { createInitialGenome, GENOME_KEYS, type Genome } from '../simulation/genetics/genome';

/**
 * テスト用の蟻を作るヘルパー。
 *
 * `createAnt` は寿命と意思決定の位相へ乱数を使うため、テストで値を固定したい場合は
 * overrides で上書きする。Genome を省略すると全形質0.5の中立個体になる。
 */

/** 全形質が同じ値の Genome。トレードオフの検証で基準として使う。 */
export function uniformGenome(value = 0.5): Genome {
  const genome = {} as Genome;
  for (const key of GENOME_KEYS) {
    genome[key] = value;
  }
  return genome;
}

export interface MakeAntOptions {
  genome?: Genome;
  seed?: string;
  overrides?: Partial<Ant>;
}

export function makeAnt(options: MakeAntOptions = {}): Ant {
  const random = createRandom(options.seed ?? 'ant-factory');
  const genome = options.genome ?? uniformGenome();

  const ant = createAnt({
    id: 'ant-test',
    lineageId: 'lineage-test',
    generation: 0,
    genome,
    x: 0,
    z: 0,
    heading: 0,
    energy: Number.POSITIVE_INFINITY,
    random,
  });

  return { ...ant, ...options.overrides };
}

/** 形質をランダムに散らした個体群。統計と生態型の検証に使う。 */
export function makeAnts(count: number, seed = 'ants'): Ant[] {
  const random = createRandom(seed);

  return Array.from({ length: count }, (_, index) =>
    createAnt({
      id: `ant-${index}`,
      lineageId: `lineage-${index}`,
      generation: 0,
      genome: createInitialGenome(random),
      x: 0,
      z: 0,
      heading: 0,
      energy: 40,
      random,
    }),
  );
}
