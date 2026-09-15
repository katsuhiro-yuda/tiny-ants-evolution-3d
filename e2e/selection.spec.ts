import { expect, test } from '@playwright/test';
import { detailPanel, gotoApp } from './helpers';

/** 仕様書 §15「個体選択」、§13「UI操作をキーボードで選択できる」 */
test.describe('個体選択', () => {
  test('キーボードで個体を選択し、詳細が表示される', async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press('n');

    await expect(detailPanel(page)).toBeVisible();
    await expect(detailPanel(page)).toContainText('現在行動');
    await expect(detailPanel(page)).toContainText('エネルギー');
    await expect(detailPanel(page)).toContainText('寿命');
  });

  test('次の個体へ移動できる', async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press('n');
    const heading = detailPanel(page).getByRole('heading');
    await expect(heading).toBeVisible();
    const first = await heading.textContent();

    await page.keyboard.press('n');
    await expect(heading).not.toHaveText(first ?? '');
  });

  test('ボタンでも選択できる', async ({ page }) => {
    await gotoApp(page);

    await page.getByRole('button', { name: '次の個体' }).click();
    await expect(detailPanel(page)).toBeVisible();
  });

  test('Escキーで選択を解除できる', async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press('n');
    await expect(detailPanel(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(detailPanel(page)).toHaveCount(0);
  });

  test('選択個体の情報が時間とともに更新される', async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press('n');
    const ageRow = detailPanel(page)
      .locator('.ant-detail__row')
      .filter({ hasText: '年齢' })
      .locator('dd');

    await expect(ageRow).toBeVisible();
    const before = await ageRow.textContent();
    await expect(ageRow).not.toHaveText(before ?? '', { timeout: 10_000 });
  });
});
