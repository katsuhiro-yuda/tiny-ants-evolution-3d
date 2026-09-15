# 残課題

各Phaseの完了報告で挙がった、その場では対応しない課題の一覧。
Phase完了時にこのファイルを更新する。MVP対象外の機能要望は書かない（仕様書 §20「将来拡張」へ）。

## 未対応

### バンドルサイズが 1.1 MB（gzip 303 kB）

- 検出: Phase 0 / `npm run build` の警告
- 原因: `three` と `@react-three/drei` が大半を占める
- 影響: 初回ロードが重い。PWAのプリキャッシュ対象になるためPhase 5でより効いてくる
- 対応時期: **Phase 5**（PWA導入時）
- 方針: `drei` を必要なコンポーネントのみに絞る、`build.rolldownOptions.output.codeSplitting` でチャンク分割を検討する。着手前に実測してから判断する

### favicon 未設定

- 検出: Phase 0 / 開発サーバーで `/favicon.ico` が404
- 影響: 機能影響なし。コンソールにエラーが出るだけ
- 対応時期: **Phase 5**（PWAアイコン一式とあわせて作成）

### `noUncheckedIndexedAccess` が無効

- 検出: Phase 0 / `tsconfig.json` の方針決定時
- 判断: 有効にすると配列・TypedArrayの添字アクセスが `T | undefined` になり、シミュレーションのホットループに `!` が増える。可読性とのトレードオフで無効とした
- 影響: 添字アクセスの範囲外参照を型で防げない。空間探索（Phase 1）やインスタンス配列（Phase 2以降）で誤りが入り込む余地が残る
- 対応時期: **判断待ち**。Phase 1の空間探索を実装した時点で、実際にどれだけ `!` が必要になるか見てから再検討する

### 蟻が餌の上に居座り、探索が起きなくなる可能性

- 検出: Phase 1 / バランス調整中
- 内容: 餌の総供給量が消費量を上回ると、蟻が1箇所に留まり続けて探索・移動が消える。現在の値は供給がやや下回るよう調整してあり発生しないが、平衡点が狭い
- 影響: `config/resources.ts` を変更すると再発しうる。Phase 2 で `speed` や `metabolism` が個体ごとに変わると消費量も変わるため、再調整が必要になる
- 対応時期: **Phase 2**（Genome導入時に再調整）
- 方針: 変更時は餓死と寿命死の両方が発生することを複数シードで確認する

### E2Eの速度テストが環境のフレームレートに依存する

- 検出: Phase 1 / E2E導入時
- 内容: ソフトウェアWebGL（SwiftShader）では低フレームレートになり、1フレームあたりのステップ数上限（`MAX_STEPS_PER_FRAME`）に張り付いて4倍速が4倍に届かない
- 影響: 絶対値での判定ができず、等倍との相対比較でしか検証していない。速度倍率の正確さはE2Eでは担保されない（単体テストの `clock.test.ts` で担保）
- 対応時期: **対応不要**。判断の記録として残す

### 誤って他プロジェクトの開発サーバーを停止した

- 発生: Phase 1 / 動作確認中
- 内容: 開発サーバーの停止スクリプトの既定ポートをVite既定の 5173 にしていたため、同じポートを使う別プロジェクトのサーバーを停止してしまった
- 対処: ポートを 5180 に固定し（`dev-server.config.json`）、停止対象のコマンドラインがこのリポジトリ配下かを確認してから停止するようにした。IPv6待受を取りこぼす `netstat -p TCP` もやめた
- 状態: **対処済み**。再発防止として CLAUDE.md へ手順を記載

### `decideBehavior` が意思決定のたびに乱数生成器を生成する

- 検出: Phase 1 / 行動スコアのランダム性修正時
- 内容: 行動ごとに独立したゆらぎを得るため、`context.noise` を種に `createRandom` を呼んでいる。1回の意思決定につきクロージャ4つ分のオブジェクトが確保される
- 影響: 100匹・意思決定間隔0.25秒で毎秒約400回。現状の計測では問題ないが、500匹規模では毎秒約2000回になりGC圧が増える可能性がある
- 対応時期: **Phase 2以降**（500匹での計測でGCが問題になった場合）
- 方針: 最適化の前に必ず計測する。必要なら `Random` を再シード可能にするか、生成器を1つ使い回す形へ変える

### 使われていない定数が config に残っている

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `src/simulation/config/world.ts` の `PHASE0_ANT_SPEED_MIN` / `PHASE0_ANT_SPEED_MAX` がどこからも参照されていない。Phase 0 では等速直線運動の速度として使っていたが、Phase 1 で `world.ts` を書き直した際に速度が `config/biology.ts` の `MAX_SPEED` へ移り、取り残された
- 影響: 動作への影響はない。ただしコメントに「Phase 2でGenome.speedから算出するようになる」と書いてあるため、今後読んだ人が現役の値だと誤解する
- なぜ検出されなかったか: `export` した定数は他ファイルから使われうるため、TypeScript の `noUnusedLocals` も ESLint も未使用を報告しない。**config へ値を集約すると、消し忘れても誰も困らない状態になりやすい**
- 対応時期: **Phase 2 着手時**。Genome 導入で `config/world.ts` を触るため、そのときに削除する
- 方針: 削除する。あわせて config 全体の参照元を一度確認する

### 移動限界 `BOUND` の計算が3箇所に重複している

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `FIELD_HALF - FIELD_MARGIN` の計算が `simulation/engine/world.ts`、`simulation/systems/movement.ts`、`simulation/resources/generate.ts` にそれぞれ書かれている
- 影響: 現状は値が一致しているため問題ない。片方だけ変更すると、蟻の移動範囲と資源の配置範囲がずれる
- 対応時期: **Phase 2 着手時**
- 方針: `movement.ts` が公開している `MOVEMENT_BOUND` へ寄せるか、`config/world.ts` で導出して1箇所にする

### `distanceToNearestWater` に戻り値の型注釈がない

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `src/simulation/resources/terrain.ts` の `distanceToNearestWater` だけ戻り値の型注釈がない。推論で `number` になるため動作と型検査に問題はないが、simulation 層の他の公開関数はすべて明示しており不統一
- 影響: 実装変更で戻り値の型が意図せず変わっても検出できない
- 対応時期: **Phase 2 着手時**（`config` の整理とあわせて）
- 方針: `: number` を付ける。あわせて `@typescript-eslint/explicit-module-boundary-types` の導入を検討すると、今後は Lint で防げる

### `generate.ts` に単体テストがない

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `src/simulation/resources/generate.ts` に対応するテストファイルがない。`computeRegrowthRate` はテストのために `export` されているが、ファイル外からの参照が1つもない
- 現状の担保: `world.test.ts` が間接的に「地形が生成される」「餌と蟻が地形の上に配置されない」「同一シードで同一配置」を確認している
- 未検証の箇所:
  - `computeRegrowthRate` の線形補間（水際で2.2倍、影響半径の外で1.0倍、水場なしで1.0倍）
  - `generateTerrain` の重なり判定（地形同士が重ならないこと）
  - 試行上限に達したとき、その地形を生成せず処理が続くこと
  - 円がフィールド境界からはみ出さないこと
- 影響: 餌の再生ボーナスはバランスに直結する。補間式を壊しても現状のテストでは落ちない
- 対応時期: **Phase 2 着手時**
- 方針: `generate.test.ts` を追加する。`computeRegrowthRate` は純粋関数なので単体で検証できる

### `movement.ts` に単体テストがない

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `src/simulation/systems/movement.ts` に対応するテストがない。`normalizeAngle` と `turnToward` は純粋関数で、角度の扱いは間違えやすい部類なのにテストで固定されていない
- 現状の担保: `world.test.ts` が「境界と地形の外へ出ない」「headingが進行方向と一致する」を統合的に確認しているのみ
- 未検証の箇所:
  - `normalizeAngle` が常に -π〜π を返すこと（負の入力、2π超、-2π未満）
  - `turnToward` が近いほうへ回ること（3.0 → -3.0 で遠回りしない）
  - 旋回速度の上限を超えないこと、目標を行き過ぎないこと
  - `moveAnt` が進路を塞がれたとき位置を変えず0を返すこと
  - 速度0のとき velocity がゼロクリアされること
- 影響: 角度のバグは「蟻が遠回りする」「その場で振動する」といった形で現れ、テストなしでは気づきにくい
- 対応時期: **Phase 2 着手時**
- 方針: `movement.test.ts` を追加する。`survival.ts` は世界の状態に依存するため `world.test.ts` の統合テストで担保する方針を維持し、こちらは純粋関数の単体テストに絞る

### 「食べられる餌」の判定が2箇所に分かれている

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `resources/food.ts` に `isEdible(food)` があり `systems/survival.ts` は使っているが、`queries/worldStats.ts` は `food.energy > 0` を直書きしている
- 影響: 現状は結果が同じ。Phase 3 で条件が増えると（腐敗・毒など）、統計側だけ古い判定のまま残り、画面の餌の数と蟻が実際に食べられる数がずれる
- 対応時期: **Phase 3 着手時**（資源が増えるタイミング）。それより早く気づいたら直してよい
- 方針: `worldStats.ts` で `isEdible` を使う

### `SimulationRuntime.getSpeed` が使われていない

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `src/state/simulationRuntime.ts` の `getSpeed` を呼んでいる箇所がない。再生速度は Zustand の `uiStore` が正本で、`SimulationDriver` が `setSpeed` で runtime へ流す一方向のため、読み返す必要がない
- 影響: なし。ただしインターフェースに未使用のメソッドが残る
- 判断が必要な点: setter があれば getter もあるという対称性で残す考え方もある。Phase 5 のセーブ・ロードで「現在の速度を保存する」なら必要になりうる
- 対応時期: **Phase 5 の保存仕様を決めるとき**に判断する。それまでは残す
- 方針: 保存対象に含めないなら削除する

### `framePriority.ts` の置き場所で state ↔ world が双方向依存になっている

- 検出: Phase 1 後 / ソース解説中に発見
- 内容: `FRAME_PRIORITY` が `src/world/renderers/` にあり、`state/SimulationDriver.tsx` がそれを参照している。一方 `world/renderers/*` は `state/simulationRuntime` と `state/uiStore` を参照しており、2つの層が相互に依存している
- 影響: 型と定数だけなので循環インポートにはならず、動作に問題はない。ただし依存の向きが一方向でないため、層の境界が曖昧になる
- 判断: フレームの実行順序は「描画」より「アプリ全体の進行制御」に属する。`src/state/` へ移すか、両層から独立した場所へ置くのが自然
- 対応時期: **Phase 4 着手時**（コロニー・フェロモンのレンダラーが増え、priority を参照する箇所が増えるタイミング）
- 方針: `src/state/framePriority.ts` へ移動する。`world → state` の一方向に揃える

## 対応済み

（なし）
