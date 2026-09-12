import { SPEED_OPTIONS, type SpeedMultiplier } from '../simulation/config/time';
import { useUiStore } from '../state/uiStore';
import type { SimulationRuntime } from '../state/simulationRuntime';
import { useWorldStats } from '../state/useWorldSnapshot';
import './TopBar.css';

/**
 * 上部バー（仕様書 §10）。経過時間、個体数、再生速度を表示する。
 * 最大世代は Phase 2 で世代が動き始めてから追加する。
 */
interface TopBarProps {
  runtime: SimulationRuntime;
}

/** 秒を mm:ss 形式にする。 */
function formatElapsed(seconds: number): string {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function speedLabel(speed: SpeedMultiplier): string {
  return speed === 0 ? '一時停止' : `${speed}倍`;
}

export function TopBar({ runtime }: TopBarProps) {
  const stats = useWorldStats(runtime);
  const speed = useUiStore((state) => state.speed);
  const setSpeed = useUiStore((state) => state.setSpeed);

  return (
    <header className="top-bar">
      <dl className="top-bar__stats">
        <div className="top-bar__stat">
          <dt>経過時間</dt>
          <dd>{formatElapsed(stats.elapsedSeconds)}</dd>
        </div>
        <div className="top-bar__stat">
          <dt>個体数</dt>
          <dd>{stats.population}</dd>
        </div>
        <div className="top-bar__stat">
          <dt>死亡数</dt>
          <dd>{stats.deathCount}</dd>
        </div>
        <div className="top-bar__stat">
          <dt>餌</dt>
          <dd>{stats.edibleFoodCount}</dd>
        </div>
      </dl>

      <div className="top-bar__speed" role="group" aria-label="再生速度">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className="top-bar__speed-button"
            aria-pressed={speed === option}
            onClick={() => setSpeed(option)}
          >
            {speedLabel(option)}
          </button>
        ))}
      </div>
    </header>
  );
}
