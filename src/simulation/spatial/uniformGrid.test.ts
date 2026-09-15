import { describe, expect, it, vi } from 'vitest';
import { createUniformGrid, type GridItem } from './uniformGrid';
import { createRandom } from '../engine/random';

interface Point extends GridItem {
  id: string;
}

function point(id: string, x: number, z: number): Point {
  return { id, position: { x, y: 0, z } };
}

function idsOf(items: readonly Point[]): string[] {
  return items.map((item) => item.id).sort();
}

describe('createUniformGrid', () => {
  it('セルサイズが0以下なら生成を拒否する', () => {
    expect(() => createUniformGrid(0)).toThrow();
    expect(() => createUniformGrid(-1)).toThrow();
  });

  it('登録数を報告する', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('a', 0, 0), point('b', 1, 1)]);

    expect(grid.size).toBe(2);
  });

  it('再構築で前回の内容が残らない', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('old', 0, 0)]);
    grid.rebuild([point('new', 0, 0)]);

    expect(idsOf(grid.queryRadius({ x: 0, y: 0, z: 0 }, 5))).toEqual(['new']);
    expect(grid.size).toBe(1);
  });

  it('半径内の要素だけを返す', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('in', 3, 0), point('edge', 5, 0), point('out', 7, 0)]);

    // 半径5ちょうどの要素は含む
    expect(idsOf(grid.queryRadius({ x: 0, y: 0, z: 0 }, 5))).toEqual(['edge', 'in']);
  });

  it('セル境界をまたぐ要素を取りこぼさない', () => {
    const grid = createUniformGrid<Point>(10);
    // セル(0,0)とセル(-1,-1)へ分かれて入る2点
    grid.rebuild([point('positive', 0.5, 0.5), point('negative', -0.5, -0.5)]);

    expect(idsOf(grid.queryRadius({ x: 0, y: 0, z: 0 }, 2))).toEqual(['negative', 'positive']);
  });

  it('負の座標を正しく扱う', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('a', -35, -35), point('b', -34, -34)]);

    expect(idsOf(grid.queryRadius({ x: -35, y: 0, z: -35 }, 3))).toEqual(['a', 'b']);
  });

  it('セルサイズを超える半径でも探索範囲を広げる', () => {
    const grid = createUniformGrid<Point>(5);
    grid.rebuild([point('far', 18, 0)]);

    expect(idsOf(grid.queryRadius({ x: 0, y: 0, z: 0 }, 20))).toEqual(['far']);
  });

  it('半径が0以下なら何も返さない', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('a', 0, 0)]);

    expect(grid.queryRadius({ x: 0, y: 0, z: 0 }, 0)).toEqual([]);
    expect(grid.findNearest({ x: 0, y: 0, z: 0 }, 0)).toBeUndefined();
  });

  it('出力配列を再利用しても前回の結果が混ざらない', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('a', 0, 0), point('b', 30, 30)]);
    const out: Point[] = [];

    grid.queryRadius({ x: 0, y: 0, z: 0 }, 5, out);
    grid.queryRadius({ x: 30, y: 0, z: 30 }, 5, out);

    expect(idsOf(out)).toEqual(['b']);
  });

  it('y座標は距離判定に影響しない（XZ平面で判定する）', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([{ id: 'high', position: { x: 1, y: 100, z: 1 } }]);

    expect(idsOf(grid.queryRadius({ x: 0, y: 0, z: 0 }, 5))).toEqual(['high']);
  });

  it('clear() で全要素を破棄する', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('a', 0, 0)]);
    grid.clear();

    expect(grid.size).toBe(0);
    expect(grid.queryRadius({ x: 0, y: 0, z: 0 }, 50)).toEqual([]);
  });
});

describe('findNearest', () => {
  it('半径内で最も近い要素を返す', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('far', 8, 0), point('near', 2, 0), point('middle', 5, 0)]);

    expect(grid.findNearest({ x: 0, y: 0, z: 0 }, 20)?.id).toBe('near');
  });

  it('半径外しかなければ undefined を返す', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('far', 100, 0)]);

    expect(grid.findNearest({ x: 0, y: 0, z: 0 }, 5)).toBeUndefined();
  });

  it('述語で候補を絞り込める', () => {
    const grid = createUniformGrid<Point>(10);
    grid.rebuild([point('skip', 1, 0), point('take', 4, 0)]);

    expect(grid.findNearest({ x: 0, y: 0, z: 0 }, 20, (item) => item.id === 'take')?.id).toBe(
      'take',
    );
  });

  it('隣接セルにあるより近い要素を見落とさない', () => {
    const grid = createUniformGrid<Point>(10);
    // 検索中心はセル(0,0)の端。より近い点は隣のセル(-1,0)にある
    grid.rebuild([point('sameCell', 5, 0), point('neighborCell', -0.5, 0)]);

    expect(grid.findNearest({ x: 0.5, y: 0, z: 0 }, 10)?.id).toBe('neighborCell');
  });
});

describe('総当たりになっていないこと', () => {
  it('遠方の要素の距離計算を行わない', () => {
    const grid = createUniformGrid<Point>(10);
    const near = point('near', 1, 1);

    // 遠方の点は position へのアクセス自体が発生しないことを検証する
    const positionSpy = vi.fn(() => ({ x: 900, y: 0, z: 900 }));
    const far = { id: 'far' } as Point;
    Object.defineProperty(far, 'position', { get: positionSpy });

    grid.rebuild([near, far]);
    positionSpy.mockClear();

    grid.queryRadius({ x: 0, y: 0, z: 0 }, 5);

    expect(positionSpy).not.toHaveBeenCalled();
  });

  it('近傍探索が全要素を走査しない（要素数に比例しない）', () => {
    const random = createRandom('scaling');
    const cellSize = 10;
    const fieldHalf = 500;
    const queries = 200;

    // position へのアクセス回数を数え、距離計算の実行回数を測る。
    // 総当たりなら 1クエリあたり N 回になる
    let accesses = 0;
    const instrumented = (id: string, x: number, z: number): Point => {
      const position = { x, y: 0, z };
      const item = { id } as Point;
      Object.defineProperty(item, 'position', {
        get: () => {
          accesses += 1;
          return position;
        },
      });
      return item;
    };

    const measureAccessesPerQuery = (count: number): number => {
      const grid = createUniformGrid<Point>(cellSize);
      const items: Point[] = [];
      for (let i = 0; i < count; i += 1) {
        items.push(
          instrumented(
            `p-${i}`,
            random.range(-fieldHalf, fieldHalf),
            random.range(-fieldHalf, fieldHalf),
          ),
        );
      }
      grid.rebuild(items);

      accesses = 0;
      for (let i = 0; i < queries; i += 1) {
        grid.queryRadius(
          { x: random.range(-fieldHalf, fieldHalf), y: 0, z: random.range(-fieldHalf, fieldHalf) },
          cellSize,
        );
      }
      return accesses / queries;
    };

    const small = measureAccessesPerQuery(1000);
    const large = measureAccessesPerQuery(10000);

    // 走査するのは 3×3 セル分だけなので、全要素数に対する割合はごく小さい
    expect(small).toBeLessThan(1000 * 0.05);
    expect(large).toBeLessThan(10000 * 0.05);

    // 要素数が10倍でも、1要素あたりの走査割合は増えない
    expect(large / 10000).toBeLessThanOrEqual((small / 1000) * 1.5);
  });
});
