import { defineConfig, devices } from '@playwright/test';

/**
 * E2E設定（仕様書 §15）。
 *
 * WebGL 2 を使うため、ヘッドレスでもGPU描画が必要になる。
 * Chromium は --use-angle=swiftshader でソフトウェア実装へフォールバックできる。
 */
const PORT = 5183;

export default defineConfig({
  testDir: './e2e',
  // ソフトウェアWebGLはCPUを大きく使う。並列度を上げるとフレームレートが落ち、
  // 起動待ちや操作の取りこぼしでテストが不安定になる
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
