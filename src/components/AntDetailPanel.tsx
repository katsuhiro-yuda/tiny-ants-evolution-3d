import { BEHAVIOR_LABELS } from '../simulation/queries/antSummary';
import { useUiStore } from '../state/uiStore';
import type { SimulationRuntime } from '../state/simulationRuntime';
import { useAntSummary } from '../state/useWorldSnapshot';
import './AntDetailPanel.css';

/**
 * 個体詳細（仕様書 §10「個体詳細」）。
 *
 * Phase 1 で表示できるのは ID・年齢・エネルギー・現在行動・系統まで。
 * 遺伝形質・食性ラベル・親・所属コロニーは Phase 2 以降で追加する。
 */
interface AntDetailPanelProps {
  runtime: SimulationRuntime;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(0)}秒`;
}

export function AntDetailPanel({ runtime }: AntDetailPanelProps) {
  const selectedAntId = useUiStore((state) => state.selectedAntId);
  const selectAnt = useUiStore((state) => state.selectAnt);

  // 選択個体の値は毎フレーム変わるため、統計と同じ間引きで購読する
  const summary = useAntSummary(runtime, selectedAntId);

  if (!selectedAntId) {
    return null;
  }

  return (
    <aside className="ant-detail" aria-label="個体詳細">
      <div className="ant-detail__header">
        <h2>{selectedAntId}</h2>
        <button type="button" onClick={() => selectAnt(undefined)} aria-label="選択を解除">
          ×
        </button>
      </div>

      {summary ? (
        <dl className="ant-detail__body">
          <div className="ant-detail__row">
            <dt>現在行動</dt>
            <dd>{BEHAVIOR_LABELS[summary.state]}</dd>
          </div>
          <div className="ant-detail__row">
            <dt>エネルギー</dt>
            <dd>
              <span className="ant-detail__meter">
                <span
                  className="ant-detail__meter-fill"
                  style={{ width: `${Math.round(summary.energyRatio * 100)}%` }}
                />
              </span>
              {Math.round(summary.energyRatio * 100)}%
            </dd>
          </div>
          <div className="ant-detail__row">
            <dt>年齢</dt>
            <dd>
              {formatSeconds(summary.ageSeconds)} / 寿命 {formatSeconds(summary.lifespanSeconds)}
            </dd>
          </div>
          <div className="ant-detail__row">
            <dt>世代</dt>
            <dd>{summary.generation}</dd>
          </div>
          <div className="ant-detail__row">
            <dt>系統</dt>
            <dd>{summary.lineageId}</dd>
          </div>
          <div className="ant-detail__row">
            <dt>位置</dt>
            <dd>
              x {summary.position.x.toFixed(1)} / z {summary.position.z.toFixed(1)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="ant-detail__gone">この個体は死亡しました。</p>
      )}
    </aside>
  );
}
