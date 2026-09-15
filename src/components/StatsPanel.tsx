import { TRACKED_TRAITS, type StatsSample } from '../analytics/statsHistory';
import { GENOME_KEYS } from '../simulation/genetics/genome';
import { DIET_LABELS, TRAIT_LABELS } from '../simulation/queries/antSummary';
import type { DietType } from '../simulation/genetics/ecotype';
import type { SimulationRuntime } from '../state/simulationRuntime';
import { useStatsHistory, useWorldStats } from '../state/useWorldSnapshot';
import './StatsPanel.css';

/**
 * 統計（仕様書 §10「統計」）。
 *
 * Phase 2 で出すのは個体数・出生死亡・世代・食性構成・形質の平均と分布、
 * および主要形質の推移。コロニー別の集計と最長存続系統は Phase 4 で追加する。
 *
 * 画面を覆わないよう折りたたみ式にする。閉じている間も購読は続くが、
 * 統計自体が250msごとの間引き済みスナップショットなので負荷にならない。
 */
interface StatsPanelProps {
  runtime: SimulationRuntime;
}

/** スパークラインの描画領域。 */
const CHART_WIDTH = 132;
const CHART_HEIGHT = 30;

const DIET_ORDER: DietType[] = ['herbivore', 'omnivore', 'carnivore'];

export function StatsPanel({ runtime }: StatsPanelProps) {
  const stats = useWorldStats(runtime);
  const history = useStatsHistory(runtime);

  const dietTotal = DIET_ORDER.reduce((sum, diet) => sum + stats.dietCounts[diet], 0);

  return (
    <details className="stats-panel">
      <summary className="stats-panel__summary">
        統計（平均世代 {stats.averageGeneration.toFixed(1)} / 個体数 {stats.population}）
      </summary>

      <div className="stats-panel__body">
        <section className="stats-panel__section" aria-label="個体数と世代">
          <h3>推移</h3>
          <div className="stats-panel__charts">
            <Sparkline
              label="個体数"
              value={String(stats.population)}
              samples={history}
              pick={(sample) => sample.population}
            />
            <Sparkline
              label="最大世代"
              value={String(stats.maxGeneration)}
              samples={history}
              pick={(sample) => sample.maxGeneration}
            />
          </div>
        </section>

        <section className="stats-panel__section" aria-label="食性構成">
          <h3>食性</h3>
          <ul className="stats-panel__diets">
            {DIET_ORDER.map((diet) => {
              const count = stats.dietCounts[diet];
              const ratio = dietTotal > 0 ? count / dietTotal : 0;

              return (
                <li key={diet} className="stats-panel__diet">
                  <span className="stats-panel__diet-label">{DIET_LABELS[diet]}</span>
                  <span className="stats-panel__bar">
                    <span
                      className="stats-panel__bar-fill"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </span>
                  <span className="stats-panel__diet-value">
                    {count}（{Math.round(ratio * 100)}%）
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="stats-panel__section" aria-label="形質の平均と分布">
          <h3>形質の平均（±は標準偏差）</h3>
          <dl className="stats-panel__traits">
            {GENOME_KEYS.map((key) => (
              <div key={key} className="stats-panel__trait">
                <dt>{TRAIT_LABELS[key]}</dt>
                <dd>
                  <span className="stats-panel__bar">
                    <span
                      className="stats-panel__bar-fill"
                      style={{ width: `${Math.round(stats.traitMeans[key] * 100)}%` }}
                    />
                    {/* 分布の広がりを平均の周りの帯で示す */}
                    <span
                      className="stats-panel__bar-deviation"
                      style={{
                        left: `${Math.max(0, (stats.traitMeans[key] - stats.traitDeviations[key]) * 100)}%`,
                        width: `${Math.min(100, stats.traitDeviations[key] * 200)}%`,
                      }}
                    />
                  </span>
                  {stats.traitMeans[key].toFixed(2)} ±{stats.traitDeviations[key].toFixed(2)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="stats-panel__section" aria-label="主要形質の推移">
          <h3>主要形質の推移（縦軸 0〜1）</h3>
          <div className="stats-panel__charts">
            {TRACKED_TRAITS.map((trait) => (
              <Sparkline
                key={trait}
                label={TRAIT_LABELS[trait]}
                value={stats.traitMeans[trait].toFixed(2)}
                samples={history}
                pick={(sample) => sample.traitMeans[trait]}
                min={0}
                max={1}
              />
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}

interface SparklineProps {
  label: string;
  value: string;
  samples: readonly StatsSample[];
  pick: (sample: StatsSample) => number;
  /** 縦軸の範囲。省略するとサンプルから決める。 */
  min?: number;
  max?: number;
}

/**
 * 時系列の折れ線。
 * 数値は必ず文字でも併記し、グラフを読めなくても値が分かるようにする（仕様書 §13）。
 */
function Sparkline({ label, value, samples, pick, min, max }: SparklineProps) {
  const values = samples.map(pick);

  return (
    <figure className="stats-panel__chart">
      <figcaption>
        {label} <strong>{value}</strong>
      </figcaption>
      <svg
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`${label}の推移。現在値 ${value}`}
      >
        <path d={buildPath(values, min, max)} fill="none" stroke="currentColor" strokeWidth={1.5} />
      </svg>
    </figure>
  );
}

/** 折れ線のパスを作る。サンプルが1点以下なら中央に水平線を引く。 */
function buildPath(values: readonly number[], min?: number, max?: number): string {
  if (values.length === 0) {
    return `M 0 ${CHART_HEIGHT / 2} L ${CHART_WIDTH} ${CHART_HEIGHT / 2}`;
  }

  const lower = min ?? Math.min(...values);
  const upper = max ?? Math.max(...values);
  // 値が一定のときに 0 除算しないよう、最低限の幅を確保する
  const span = upper - lower > 1e-6 ? upper - lower : 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? CHART_WIDTH : (index / (values.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((value - lower) / span) * CHART_HEIGHT;

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}
