import './WebGLUnsupported.css';

/** WebGL 2 非対応環境向けの説明画面（仕様書 §13）。 */
export function WebGLUnsupported() {
  return (
    <main className="webgl-unsupported">
      <h1>WebGL 2 が利用できません</h1>
      <p>
        Tiny Ants: Evolution 3D の実行には WebGL 2 に対応したブラウザが必要です。 最新版の
        Chrome、Edge、Firefox のデスクトップ版でお試しください。
      </p>
      <p>
        ブラウザが対応している場合でも、ハードウェアアクセラレーションが無効になっていると
        利用できないことがあります。ブラウザの設定をご確認ください。
      </p>
    </main>
  );
}
