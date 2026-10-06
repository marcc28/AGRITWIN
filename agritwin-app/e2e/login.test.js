describe('Login', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });


  it('logs in successfully', async () => {
    // Primer anem a Sign Up
    
    await element(by.id('signup-button')).tap();

    await expect(element(by.id('signup-username'))).toBeVisible();

    const suffix = Date.now();
    const username = `test_${suffix}`;
    const email = `test_${suffix}@gmail.com`;
    const password = 'Password123!';

    // Crear usuari
    await element(by.id('signup-username')).typeText(username);
    await element(by.id('signup-password')).typeText(password);
    await element(by.id('signup-password-confirm')).typeText(password);
    await element(by.id('signup-email')).typeText(email);

    await device.pressBack();

    await element(by.id('privacy-checkbox')).tap();
    await element(by.id('security-checkbox')).tap();

    await element(by.id('signup-button')).tap();

    // Esperem que el compte s'hagi creat
    await waitFor(element(by.text("El compte s'ha creat correctament")))
      .toBeVisible()
      .withTimeout(10000);
    
    await expect(element(by.id('username-button'))).toBeVisible();

    // Login
    await element(by.id('username-button')).typeText(username);
    await element(by.id('password-button')).typeText(password);
    
    await device.pressBack();

    await element(by.id('login-button')).tap();

    // Comprovar que hem anat a Home
    await waitFor(element(by.text('AgriTwin')))
      .toBeVisible()
      .withTimeout(10000);
  });
});