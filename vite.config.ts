import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // シミュレーションは DOM 非依存のため、既定環境は node のままとする。
    // DOM が必要なテストは Phase 1 で jsdom を導入してから追加する。
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/simulation/**', 'src/analytics/**'],
    },
  },
});
