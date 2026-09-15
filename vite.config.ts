import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import devServer from './dev-server.config.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],

  server: {
    // Viteの既定値 5173 は他プロジェクトと衝突しやすいため、専用の番号を固定で使う。
    // 動作確認のたびにポートを変えると開発サーバーが残り続ける（npm run dev:stop で停止する）
    port: devServer.port,
    strictPort: true,
  },

  test: {
    // シミュレーションは DOM 非依存のため、既定環境は node のままとする。
    // DOM が必要なテストはファイル単位で jsdom を指定する
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/simulation/**', 'src/analytics/**'],
    },
  },
});
