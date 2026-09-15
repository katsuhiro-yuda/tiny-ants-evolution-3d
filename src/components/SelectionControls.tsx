import { nextAntId } from '../state/selection';
import { useUiStore } from '../state/uiStore';
import type { SimulationRuntime } from '../state/simulationRuntime';
import './SelectionControls.css';

/**
 * 個体選択のキーボード・ボタン操作（仕様書 §13「UI操作をキーボードで選択できる」）。
 * マウスで小さな蟻を狙えない場合の代替手段でもある。
 */
interface SelectionControlsProps {
  runtime: SimulationRuntime;
}

export function SelectionControls({ runtime }: SelectionControlsProps) {
  const selectAnt = useUiStore((state) => state.selectAnt);

  const step = (direction: 1 | -1) => {
    const { selectedAntId } = useUiStore.getState();
    selectAnt(nextAntId(runtime.world.ants, selectedAntId, direction));
  };

  return (
    <div className="selection-controls" role="group" aria-label="個体選択">
      <button type="button" onClick={() => step(-1)}>
        前の個体
      </button>
      <button type="button" onClick={() => step(1)}>
        次の個体
      </button>
      <p className="selection-controls__hint">
        クリックでも選択できます。Space で一時停止、Esc で選択解除。
      </p>
    </div>
  );
}
