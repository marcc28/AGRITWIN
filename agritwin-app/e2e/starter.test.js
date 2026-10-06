describe('Signup', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await device.launchApp({
      newInstance: true,
      delete: true,
    });
  });

  it('creates an account', async () => {
    const suffix = Date.now();
    const username = `test_${suffix}`;
    const email = `test_${suffix}@gmail.com`;
    const password = 'Password123!';

    await element(by.id('signup-button')).tap();

    await expect(element(by.id('signup-username'))).toBeVisible();
    await element(by.id('signup-username')).typeText(username);
    await element(by.id('signup-password')).typeText(password);
    await element(by.id('signup-password-confirm')).typeText(password);
    await element(by.id('signup-email')).typeText(email);
    await device.pressBack();
    await element(by.id('privacy-checkbox')).tap();
    await element(by.id('security-checkbox')).tap();
    await element(by.id('signup-button')).tap();

    
  });
});