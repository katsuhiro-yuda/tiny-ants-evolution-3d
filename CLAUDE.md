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

**Phase 1（生存）まで完了。** 次は Phase 2（進化）で、着手前にIssue作成・ブランチ作成・計画提示が必要。

実装済みの構造:

- `src/simulation/` — React / Three.js 非依存。ESLint の `no-restricted-imports` で依存を禁止しているので、回避せず設計側を直すこと
  - `engine/` — シード付き乱数（mulberry32）、固定タイムステップ、`world.ts`（各システムを順に呼ぶ）
  - `spatial/uniformGrid.ts` — 近傍探索。セルサイズ＝想定最大視界で3×3セルに収める。毎ステップ再構築
  - `systems/` — 代謝、移動、餌の再生、`survival.ts`（意思決定→移動→採食→代謝→死亡判定）
  - `behaviors/` — 行動スコア。`DecisionContext` には視界内の餌しか入らず、視界外参照を型で防ぐ
  - `resources/` — 餌・地形。餌は食べ尽くしても消さず再生待ちにする（配列長を固定に保つ）
  - `queries/` — UI向けの読み取り専用ビュー。表示用の整形はここでだけ行う
  - `config/` — バランス値。`resources.ts` の餌の供給量は慎重に調整済み（下記）
- `src/state/` — `simulationRuntime.ts` がシミュレーションとUIの唯一の橋渡し。`uiStore.ts`（Zustand）は選択個体と再生速度だけを持つ
- `src/state/SimulationDriver.tsx` — `useFrame` を priority 1/3 で使い、シミュレーション → 描画 → 計測確定の順序を固定する。priority 1以上のuseFrameがあるとR3Fの自動描画が止まるため、`gl.render` を明示的に呼んでいる
- `src/world/renderers/` — `InstancedMesh`。行列書き込みは priority 2。一時オブジェクトはモジュールスコープで使い回し、ループ内で確保しない
- `src/analytics/perfMetrics.ts` — 固定長リングバッファでメモリを増やさない
- `e2e/` — Playwright。`helpers.ts` の `gotoApp` を必ず経由する

未実装（各Phaseで追加）: `simulation/{genetics,colony}`、`persistence/`、`workers/`

### 注意が必要な箇所

- **餌のバランス値は動的な平衡点にある。** 餌の総供給量（個数 × 容量 ÷ 再生時間）が100匹の総消費量をやや下回るよう調整してある。上回ると蟻が餌の上に居座って探索が消え、大きく下回ると開始1分で全滅する。`config/resources.ts` を変更したら、餓死と寿命死の両方が発生することを複数シードで確認すること。
- **`useSyncExternalStore` の getSnapshot は必ず同じ参照を返すこと。** 毎回新しいオブジェクトを返すと無限更新になる。`useWorldSnapshot.ts` の `useAntSummary` がキャッシュの実装例。
- **E2EはソフトウェアWebGLで動くため遅い。** 並列度は2。低フレームレートでは1フレームあたりのステップ数上限に張り付くため、速度のテストは絶対値で判定しない。

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
npm run test:e2e   # playwright test
npm run build      # typecheck + vite build
npm run format     # prettier --write .
```

単一テストは `npx vitest run src/simulation/engine/world.test.ts`、単一E2Eは `npx playwright test e2e/speed.spec.ts -g "テスト名"`。

Vitest の既定環境は `node`。シミュレーションはDOM非依存のため、これを維持する。DOMが要るテストはファイル単位で jsdom を指定する。

### 開発サーバーの扱い

動作確認のために開発サーバーを起動したら、**確認が終わったら必ず停止する**。

```bash
npm run dev       # ポート5180で起動（dev-server.config.json で固定）
npm run dev:stop  # 停止
```

- **ポートを変えて起動し直さない。** ポートを変えるとサーバーが残り続け、CPUとポートを消費し続ける。ポートが埋まっている場合は、まず `npm run dev:stop` で自分のサーバーを止める。
- `npm run dev:stop` は、そのポートを使っているのがこのリポジトリのプロセスかを確認してから停止する。5173 のようなVite既定ポートは他プロジェクトと衝突しやすく、ポート番号だけで判断すると無関係なサーバーを落とすため。
- ポートの調査に `netstat -p TCP` を使わない。Vite は IPv6（`::1`）で待ち受けるが、このオプションは IPv4 しか列挙せず取りこぼす。`Get-NetTCPConnection` を使う。

## 作業フロー（仕様書 §0, §16）

### 作業の開始手順

新しい作業（Phaseや修正）に取りかかるときは、**必ず次の順序で進める**。計画の提示はステップ3であり、Issueとブランチより先に行わない。

1. **Issueを作成する。** 作業の目的・範囲・完了条件・対象外を書く。Phase作業なら仕様書の該当Phaseの完了条件をそのまま完了条件にする。

   ```bash
   gh issue create --title "Phase 1: 生存" --body-file <本文ファイル>
   ```

2. **そのIssueからブランチを作成して切り替える。** `gh issue develop` を使うとIssueとブランチが紐づき、PR作成時に自動でIssueが閉じられる。

   ```bash
   gh issue develop <番号> --name <番号>-<英語のスラッグ> --base main --checkout
   ```

   **ブランチ名は必ず ASCII で明示する。** `--name` を省略するとIssueタイトルからブランチ名が生成され、日本語タイトルなら日本語のブランチ名になってしまう。`1-phase-1-survival` のように、Issue番号 + 英小文字ケバブケースにする。

3. **調査結果と実装計画を提示し、ユーザーの確認を待つ。** ここで初めて計画を出す。確認なしに実装へ進まない。

4. **実装する。** 小さな単位でコミットし、各単位で型検査またはテストを行う。

5. **完了時に品質ゲートを実行し、報告する。** typecheck / lint / test / build（E2E導入済みなら test:e2e も）。報告は仕様書 §16 のフォーマット。

6. **PRを作成する。** `.github/pull_request_template.md` に沿って書く。本文の `Closes #` へIssue番号を入れる。マージ方法はユーザーの指示に従う。

`main` へ直接コミットしない。例外は、この作業フロー自体の変更のように、Issueを立てる対象がない運用上の変更だけ。

### 進め方の原則

- Phase を1つずつ進める。全機能を一括実装しない。
- 各 Phase 完了時に typecheck / lint / test / build を実行し、仕様書 §16 の報告フォーマット（実装内容・主要変更ファイル・検証結果・性能・仕様との差異・残課題・次の推奨）で報告する。
- 報告した残課題は口頭で終わらせず、必ず [docs/backlog.md](docs/backlog.md) へ記録する。会話が終わると失われるため。既存項目の解消時は「対応済み」へ移す。
- テストを通すためにテスト自体を弱めたり削除したりしない。
- MVP対象外（仕様書 §2 の除外リスト、§20 の将来拡張）を作り込まない。
- 仕様に曖昧さがある場合は勝手に拡張せず質問する。
- 作業途中でも常に動作可能・検証可能な状態を維持する。

## 性能目標

100匹で60 FPS、500匹で30 FPS以上が努力目標。FPS・描画時間・シミュレーション更新時間を開発モードで確認できるようにする。最適化の前に必ず計測する。
