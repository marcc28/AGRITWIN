const {
  device,
  element,
  by,
  expect,
  waitFor,
} = require('detox');


const { loginAsNewUser } = require('./helpers/auth');

describe('Market', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it('shows market products and allows switching to news', async () => {
    // Navegar fins a Market segons la navegació real de la teva app.
    await loginAsNewUser();

    await element(by.text('Mercat')).tap();

    // Comprovar que estem a Market
    await expect(element(by.id('market-screen'))).toBeVisible();

    // Esperem que aparegui almenys un producte
    await waitFor(element(by.id('product-item-1')))
      .toBeVisible()
      .withTimeout(15000);

    // Comprovar producte
    await expect(element(by.text('Tomato'))).toBeVisible();
    await expect(element(by.text('Solanum lycopersicum'))).toBeVisible();
    await expect(element(by.text('2.50 €'))).toBeVisible();

    // Anar a News
    await element(by.id('market-tab-news')).tap();

    // Comprovar notícia
    await waitFor(element(by.id('news-item-1')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.text('Market update'))).toBeVisible();
    await expect(
      element(by.text('Prices have increased this week.')),
    ).toBeVisible();

    // El producte ja no hauria de ser visible
    await expect(element(by.id('product-item-1'))).not.toBeVisible();

    // Tornar a Prices
    await element(by.id('market-tab-prices')).tap();

    // El producte torna a aparèixer
    await waitFor(element(by.id('product-item-1')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.text('Tomato'))).toBeVisible();
  });
});