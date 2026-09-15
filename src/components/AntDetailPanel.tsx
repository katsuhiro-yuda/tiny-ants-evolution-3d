import {
  BEHAVIOR_LABELS,
  DIET_LABELS,
  FEATURE_LABELS,
  TRAIT_LABELS,
} from '../simulation/queries/antSummary';
import { GENOME_KEYS } from '../simulation/genetics/genome';
import { useUiStore } from '../state/uiStore';
import type { SimulationRuntime } from '../state/simulationRuntime';
import { useAntSummary } from '../state/useWorldSnapshot';
import './AntDetailPanel.css';

/**
 * 個体詳細（仕様書 §10「個体詳細」）。
 *
 * Phase 2 で表示できるのは ID・年齢・世代・エネルギー・行動・食性ラベル・
 * 特徴ラベル・全遺伝形質・親・系統まで。所属コロニーと追跡は Phase 4 で追加する。
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
        <>
          <p className="ant-detail__labels">
            <span className="ant-detail__badge ant-detail__badge--diet">
              {DIET_LABELS[summary.diet]}
            </span>
            {summary.featureLabels.map((trait) => (
              <span key={trait} className="ant-detail__badge">
                {FEATURE_LABELS[trait]}
              </span>
            ))}
          </p>

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
                {summary.mature ? '' : `（成熟 ${formatSeconds(summary.maturityAgeSeconds)}）`}
              </dd>
            </div>
            <div className="ant-detail__row">
              <dt>世代</dt>
              <dd>{summary.generation}</dd>
            </div>
            <div className="ant-detail__row">
              <dt>親</dt>
              <dd>{summary.parentId ?? '初期個体'}</dd>
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

          <h3 className="ant-detail__section">遺伝形質</h3>
          <dl className="ant-detail__traits">
            {GENOME_KEYS.map((key) => (
              <div key={key} className="ant-detail__trait">
                <dt>{TRAIT_LABELS[key]}</dt>
                <dd>
                  <span className="ant-detail__bar">
                    <span
                      className="ant-detail__bar-fill"
                      style={{ width: `${Math.round(summary.genome[key] * 100)}%` }}
                    />
                  </span>
                  {summary.genome[key].toFixed(2)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="ant-detail__gone">この個体は死亡しました。</p>
      )}
    </aside>
  );
}
