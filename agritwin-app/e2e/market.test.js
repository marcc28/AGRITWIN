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

    await new Promise(resolve => setTimeout(resolve, 15000));


    // Esperar que la pantalla principal sigui visible.
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(20000);

    await device.launchApp({
      newInstance: false,
      url: 'agritwin:///app/market',
    });

    // Comprovar que s'ha obert Market.
    await waitFor(element(by.id('market-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // Esperar el primer producte.
    await waitFor(element(by.id('product-item-1')))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id('product-name-1')))
      .toHaveText('Tomàquet');

    await expect(element(by.id('product-technical-name-1')))
      .toHaveText('Solanum lycopersicum');

    await expect(element(by.id('product-price-1')))
      .toHaveText('2.50 €');
  
    // Canviar a notícies.
    await element(by.id('market-tab-news')).tap();
  
    await new Promise(resolve => setTimeout(resolve, 7000));
  
    await waitFor(element(by.id('news-item-2')))
      .toBeVisible()
      .withTimeout(20000);

    await expect(element(by.id('news-title-2')))
      .toHaveText("Nova línia d'ajudes per a joves agricultors");

    await expect(element(by.id('news-content-2')))
      .toHaveText('El Departament d\'Agricultura anuncia una nova línia d\'ajudes directes per a joves agricultors, amb un màxim de 15.000€ per explotació.');

    // Tornar als preus.
    await element(by.id('market-tab-prices')).tap();
    await new Promise(resolve => setTimeout(resolve, 7000));

    await waitFor(element(by.id('product-item-1')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.id('product-name-1')))
      .toHaveText('Tomàquet');
  });
});