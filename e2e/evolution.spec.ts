import { expect, test } from '@playwright/test';
import { detailPanel, gotoApp, statsPanel, topBarStat } from './helpers';

/** 仕様書 §14 Phase 2「世代、形質統計、系統ID」、§10「個体詳細」「統計」 */
test.describe('進化の表示', () => {
  test('個体詳細に全遺伝形質と生態型ラベルが出る', async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press('n');
    await expect(detailPanel(page)).toBeVisible();

    await expect(detailPanel(page)).toContainText('遺伝形質');
    // 仕様書 §5 の形質のうち代表的なもの
    await expect(detailPanel(page)).toContainText('速度');
    await expect(detailPanel(page)).toContainText('繁殖力');
    await expect(detailPanel(page)).toContainText('フェロモン感度');
    // 食性は固定クラスではなく消化形質から算出される（仕様書 §6）
    await expect(detailPanel(page).locator('.ant-detail__badge--diet')).toBeVisible();
    // 系統と親（初期個体は親を持たない）
    await expect(detailPanel(page)).toContainText('系統');
    await expect(detailPanel(page)).toContainText('初期個体');
  });

  test('統計パネルを開くと形質分布と食性構成が出る', async ({ page }) => {
    await gotoApp(page);

    // 折りたたまれている間は中身が見えない（仕様書 §10「折りたたみ式」）
    await expect(statsPanel(page)).toBeVisible();
    await expect(page.locator('.stats-panel__body')).toBeHidden();

    await statsPanel(page).click();

    await expect(page.locator('.stats-panel__body')).toBeVisible();
    await expect(page.getByRole('region', { name: '食性構成' })).toContainText('草食型');
    await expect(page.getByRole('region', { name: '食性構成' })).toContainText('肉食型');
    await expect(page.getByRole('region', { name: '形質の平均と分布' })).toContainText('代謝効率');
    await expect(page.getByRole('region', { name: '主要形質の推移' })).toBeVisible();
  });

  test('繁殖が起きて世代が進む', async ({ page }) => {
    // 最初の繁殖まではシミュレーション内で十数秒かかる。ソフトウェアWebGLでは
    // 実時間の進みがそれより遅くなるため、既定の30秒では足りない
    test.setTimeout(150_000);
    await gotoApp(page);

    // 初期個体は全員が第0世代
    await expect(topBarStat(page, '最大世代')).toHaveText('0');

    await page.getByRole('button', { name: '4倍' }).click();

    // 成熟してエネルギーが貯まると繁殖が始まる。
    // ソフトウェアWebGLではフレームレートが低く、シミュレーション時間の進みも遅い
    await expect(topBarStat(page, '出生数')).not.toHaveText('0', { timeout: 120_000 });
    await expect(topBarStat(page, '最大世代')).not.toHaveText('0');
  });
});
