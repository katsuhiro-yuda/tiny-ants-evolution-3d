# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロダクト

`Tiny Ants: Evolution 3D` — ブラウザ内で完結する3D蟻進化シミュレーション。プレイヤーは蟻を直接操作せず、餌・水場・岩などを配置して環境を間接的に変え、適応・種分岐・捕食・コロニー形成を観察する。バックエンド、ログイン、外部APIは一切使用しない。MVPのゴールは「複数コロニー＋餌フェロモン」まで。

## 正本となる仕様書

[docs/tiny-ants-claude-code-spec.md](docs/tiny-ants-claude-code-spec.md) が要件の正本。機能の計画・実装の前に必ず該当セクションを読むこと。特に以下は仕様書側にのみ詳細がある。

- §5 遺伝形質14種と `Genome` / `AntEntity` の型定義
- §6 トレードオフ（能力には必ずコストを対応させる）
- §7 行動状態と意思決定
- §8 巣・コロニー・フェロモン
- §14 Phase 0〜5 の範囲と完了条件
- §15 単体・E2Eテストの必須対象
- §19 受入条件チェックリスト

## 現在の状態

**Phase 0（技術検証）まで完了。** 次は Phase 1（生存）で、着手前に計画提示と確認が必要。

実装済みの構造:

- `src/simulation/` — React / Three.js 非依存。`engine/random.ts`（mulberry32）、`engine/clock.ts`（固定タイムステップ）、`engine/world.ts`（Phase 0は等速移動＋境界反射のみ）、`config/`（バランス値）
- `src/state/simulationRuntime.ts` — シミュレーションとUIの唯一の橋渡し。Phase 1でZustandを入れてもこの境界は維持する
- `src/state/SimulationDriver.tsx` — `useFrame` を priority 1/3 で使い、シミュレーション → 描画 → 計測確定の順序を固定する。priority 1以上のuseFrameがあるとR3Fの自動描画が止まるため、`gl.render` を明示的に呼んでいる
- `src/world/renderers/AntInstances.tsx` — `InstancedMesh`。行列書き込みは priority 2。一時オブジェクトはモジュールスコープで使い回し、ループ内で確保しない
- `src/analytics/perfMetrics.ts` — FPS・描画時間・更新時間の移動平均。固定長リングバッファでメモリを増やさない

未実装（各Phaseで追加）: `simulation/{systems,behaviors,genetics,colony,resources,spatial}`、`persistence/`、`workers/`

ESLint が `src/simulation/**` からの React / Three.js インポートを禁止している（`no-restricted-imports`）。レイヤ分離はLintで担保されているので、回避せず設計側を直すこと。

## アーキテクチャ原則

仕様書 §12 のレイヤ分離を守る。これは複数ファイルにまたがる制約で、後から直すのが高コストなため最初から徹底する。

```
UI / React → Application State (Zustand) → Simulation Engine (純粋TS) → Renderer / Three.js
                                              ↕ Persistence / IndexedDB
```

- シミュレーションロジックに React / Three.js / DOM を混ぜない。DOMなしで単体テストできる状態を保つ。
- 描画・UI専用の値を `AntEntity` などのシミュレーションモデルへ持ち込まない。
- 乱数は必ず注入可能なシード付きジェネレータ経由。同一シードで同一の世界が再現できることが受入条件。
- シミュレーションは描画から分離した固定タイムステップ。バックグラウンド復帰時に経過時間を一括計算しない。
- バランス値・係数はコード内に散らさず `src/simulation/config` 配下へ集約し、純粋関数として計算する。
- 近傍探索は Uniform Grid / Spatial Hash を使う。全個体総当たりは禁止。
- 蟻の描画は `InstancedMesh` が基本。
- 初期実装はメインスレッドで可。ただし Web Worker へ移せる API 境界を維持する。
- 保存データはスキーマバージョンを持ち、読み込み時に型・値域を検証する。
- 統計の時系列データには上限を設ける（長時間実行でメモリが増え続けないこと）。

## 技術スタック（仕様書 §12 で確定済み）

バージョンは仕様書 §12 の表を正本とする（`package.json` と一致させること）。

| 技術                                     | 版                       | 導入Phase |
| ---------------------------------------- | ------------------------ | --------- |
| Vite / @vitejs/plugin-react              | 8.3.0 / 6.1.1            | 0         |
| TypeScript (strict)                      | **5.9.3**                | 0         |
| React / React DOM                        | **19.2.8**               | 0         |
| Three.js / @react-three/fiber / drei     | 0.186.0 / 9.7.0 / 10.7.8 | 0         |
| Vitest / @vitest/coverage-v8             | 5.0.0                    | 0         |
| ESLint / typescript-eslint / Prettier    | 10.10.0 / 8.70.0 / 3.9.6 | 0         |
| Zustand                                  | 5.0.15                   | 1         |
| Testing Library (react/jest-dom) / jsdom | 16.3.3 / 7.0.1 / 30.0.1  | 1         |
| Playwright                               | 1.63.0                   | 1         |
| Dexie                                    | 4.4.6                    | 5         |
| vite-plugin-pwa                          | 1.3.0                    | 5         |

**React 19.2.x と TypeScript 5.9.x は意図的に最新版より下げている。** React 19.3 は `@react-three/fiber` 9.7.0 の peer 範囲外、TypeScript 7 は `typescript-eslint` 8.70.0 の peer 範囲外。理由を確認せずに引き上げないこと。

依存の追加・変更は、必要性・代替案・バンドルサイズへの影響を着手前に説明してから行う。

## 推奨ディレクトリ

```
src/
  app/ components/ state/ persistence/ analytics/ workers/ test/
  world/       scene/ renderers/ camera/
  simulation/  engine/ entities/ systems/ behaviors/ genetics/ colony/ resources/ spatial/ config/
```

## コマンド

```bash
npm run dev        # 開発サーバー
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run test       # vitest run
npm run build      # typecheck + vite build
npm run format     # prettier --write .
```

単一テストは `npx vitest run src/simulation/engine/world.test.ts`。
`npm run test:e2e` はPhase 1でPlaywrightを導入してから追加する（単一E2Eは `npx playwright test path/to/spec.ts -g "テスト名"`）。

Vitest の既定環境は `node`。シミュレーションはDOM非依存のため、これを維持する。DOMが要るテストはPhase 1でjsdomを入れてから追加する。

## 作業フロー（仕様書 §0, §16）

- Phase を1つずつ進める。全機能を一括実装しない。
- 各 Phase の着手前に調査結果と実装計画を提示し、ユーザーの確認を待ってから実装する。
- 各 Phase 完了時に typecheck / lint / test / build を実行し、仕様書 §16 の報告フォーマット（実装内容・主要変更ファイル・検証結果・性能・仕様との差異・残課題・次の推奨）で報告する。
- 報告した残課題は口頭で終わらせず、必ず [docs/backlog.md](docs/backlog.md) へ記録する。会話が終わると失われるため。既存項目の解消時は「対応済み」へ移す。
- テストを通すためにテスト自体を弱めたり削除したりしない。
- MVP対象外（仕様書 §2 の除外リスト、§20 の将来拡張）を作り込まない。
- 仕様に曖昧さがある場合は勝手に拡張せず質問する。
- 作業途中でも常に動作可能・検証可能な状態を維持する。

## 性能目標

100匹で60 FPS、500匹で30 FPS以上が努力目標。FPS・描画時間・シミュレーション更新時間を開発モードで確認できるようにする。最適化の前に必ず計測する。
