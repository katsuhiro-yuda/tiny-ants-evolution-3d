import { expect, test } from '@playwright/test';
import { elapsedLabel, gotoApp, readElapsedSeconds } from './helpers';

/** 仕様書 §15「停止と速度変更」 */
test.describe('再生速度', () => {
  test('一時停止するとシミュレーション時間が止まる', async ({ page }) => {
    await gotoApp(page);

    await page.getByRole('button', { name: '一時停止' }).click();
    await expect(page.getByRole('button', { name: '一時停止' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const stoppedAt = await elapsedLabel(page).textContent();
    await page.waitForTimeout(1500);

    expect(await elapsedLabel(page).textContent()).toBe(stoppedAt);
  });

  test('Spaceキーで一時停止と再開ができる', async ({ page }) => {
    await gotoApp(page);

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: '一時停止' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: '1倍' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('4倍速のほうが等倍より時間が速く進む', async ({ page }) => {
    await gotoApp(page);

    /** 指定した実時間の間にシミュレーション時間がどれだけ進むかを測る。 */
    const measureAdvance = async (durationMs: number): Promise<number> => {
      const before = await readElapsedSeconds(page);
      await page.waitForTimeout(durationMs);
      return (await readElapsedSeconds(page)) - before;
    };

    // 絶対値で判定しない。E2EはソフトウェアWebGLで動くためフレームレートが低く、
    // 1フレームあたりのステップ数上限に張り付いて4倍に届かないことがある
    const atNormalSpeed = await measureAdvance(2000);

    await page.getByRole('button', { name: '4倍' }).click();
    const atFastSpeed = await measureAdvance(2000);

    expect(atFastSpeed).toBeGreaterThan(atNormalSpeed);
  });
});
