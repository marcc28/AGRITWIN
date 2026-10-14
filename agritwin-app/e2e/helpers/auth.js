const { device, element, by, waitFor } = require('detox');

async function signupNewUser() {
  await element(by.id('signup-button')).tap();

  await waitFor(element(by.id('signup-username')))
    .toBeVisible()
    .withTimeout(15000);

  const suffix = Date.now();
  const username = `test_${suffix}`;
  const email = `test_${suffix}@gmail.com`;
  const password = 'Password123!';

  // Omplir el formulari de registre
  await element(by.id('signup-username')).typeText(username);
  await element(by.id('signup-password')).typeText(password);
  await element(by.id('signup-password-confirm')).typeText(password);
  await element(by.id('signup-email')).typeText(email);

  await device.pressBack();

  await element(by.id('privacy-checkbox-press')).tap();
  await element(by.id('security-checkbox-press')).tap();

  await element(by.id('signup-button')).tap();
  await new Promise((resolve) => setTimeout(resolve, 7000));

  // Esperar que el registre hagi acabat

  return { username, email, password };
}

async function loginAsNewUser() {
  const user = await signupNewUser();

  // Iniciar sessió amb el compte creat
  await element(by.id('username-input')).typeText(user.username);
  await element(by.id('password-input')).typeText(user.password);

  await device.pressBack();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await element(by.id('login-button')).tap();

  await new Promise((resolve) => setTimeout(resolve, 7000));

  await waitFor(element(by.id('home-screen')))
    .toBeVisible()
    .withTimeout(30000);

  return user;
}

module.exports = {
  signupNewUser,
  loginAsNewUser,
};
