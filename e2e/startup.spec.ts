import { expect, test } from '@playwright/test';
import { elapsedLabel, gotoApp } from './helpers';

/** 仕様書 §15「起動して世界が表示される」 */
test.describe('起動', () => {
  test('世界が表示され、初期個体数が出る', async ({ page }) => {
    await page.goto('/');

    // WebGL 2 非対応の説明画面ではなく、3D世界が出ていること
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'WebGL 2 が利用できません' })).toHaveCount(0);

    await expect(
      page.locator('.top-bar__stat').filter({ hasText: '個体数' }).locator('dd'),
    ).toHaveText('100');
  });

  test('シミュレーション時間が進む', async ({ page }) => {
    await gotoApp(page);

    await expect(elapsedLabel(page)).not.toHaveText('00:00');
  });
});
