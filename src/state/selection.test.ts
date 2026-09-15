import { describe, expect, it } from 'vitest';
import { nextAntId } from './selection';
import type { Ant } from '../simulation/entities/ant';

function makeAnts(ids: string[]): Ant[] {
  return ids.map((id) => ({
    id,
    lineageId: id,
    generation: 0,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    heading: 0,
    age: 0,
    lifespan: 100,
    energy: 50,
    state: 'Explore' as const,
    decisionCooldown: 0,
    wanderHeading: 0,
  }));
}

describe('nextAntId', () => {
  const ants = makeAnts(['a', 'b', 'c']);

  it('未選択なら先頭を選ぶ', () => {
    expect(nextAntId(ants, undefined, 1)).toBe('a');
  });

  it('逆方向で未選択なら末尾を選ぶ', () => {
    expect(nextAntId(ants, undefined, -1)).toBe('c');
  });

  it('次の個体へ進む', () => {
    expect(nextAntId(ants, 'a', 1)).toBe('b');
  });

  it('前の個体へ戻る', () => {
    expect(nextAntId(ants, 'b', -1)).toBe('a');
  });

  it('末尾から先頭へ循環する', () => {
    expect(nextAntId(ants, 'c', 1)).toBe('a');
  });

  it('先頭から末尾へ循環する', () => {
    expect(nextAntId(ants, 'a', -1)).toBe('c');
  });

  it('選択個体が死亡していれば端から選び直す', () => {
    expect(nextAntId(ants, 'dead', 1)).toBe('a');
  });

  it('個体がいなければ undefined', () => {
    expect(nextAntId([], 'a', 1)).toBeUndefined();
  });
});
