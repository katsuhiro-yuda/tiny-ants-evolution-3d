import { expect, type Page } from '@playwright/test';

/**
 * アプリを開き、操作を受け付ける状態になるまで待つ。
 *
 * E2EはソフトウェアWebGL（SwiftShader）で動くため起動が遅い。
 * 待たずにキー操作を送ると取りこぼすので、必ずこれを経由する。
 */
export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');

  await expect(page.locator('canvas')).toBeVisible();
  // シミュレーションが動き出していれば、キーボード操作の購読も済んでいる
  await expect(elapsedLabel(page)).not.toHaveText('00:00', { timeout: 20_000 });
}

/** 経過時間の表示。 */
export function elapsedLabel(page: Page) {
  return page.locator('.top-bar__stat').filter({ hasText: '経過時間' }).locator('dd');
}

/** 経過時間を秒として読む。 */
export async function readElapsedSeconds(page: Page): Promise<number> {
  const text = (await elapsedLabel(page).textContent()) ?? '00:00';
  const [minutes, seconds] = text.split(':').map(Number);
  return minutes * 60 + seconds;
}

/** 個体詳細パネル。 */
export function detailPanel(page: Page) {
  return page.getByRole('complementary', { name: '個体詳細' });
}
