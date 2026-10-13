const { device, element, by, waitFor } = require('detox');

const { loginAsNewUser } = require('./helpers/auth');

describe('Login', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it('logs in successfully', async () => {
    await loginAsNewUser();

    // Aquí pots comprovar que has entrat a la pantalla principal.
  });
});
