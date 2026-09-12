/**
 * WebGL 2 の利用可否判定（仕様書 §13）。
 * 非対応環境では説明画面を表示し、Canvasの初期化を試みない。
 */
export function isWebGL2Available(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null;
  } catch {
    return false;
  }
}
