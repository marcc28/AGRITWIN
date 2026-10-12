const {
    device,
    element,
    by,
    waitFor,
} = require('detox');

async function loginAsNewUser() {
    await element(by.id('signup-button')).tap();

    await waitFor(element(by.id('signup-username')))
        .toBeVisible()
        .withTimeout(15000);

    const suffix = Date.now();
    const username = `test_${suffix}`;
    const email = `test_${suffix}@gmail.com`;
    const password = 'Password123!';

    await element(by.id('signup-username')).typeText(username);
    await element(by.id('signup-password')).typeText(password);
    await element(by.id('signup-password-confirm')).typeText(password);
    await element(by.id('signup-email')).typeText(email);

    await device.pressBack();

    await element(by.id('privacy-checkbox-press')).tap();
    await element(by.id('security-checkbox-press')).tap();

    await element(by.id('signup-button')).tap();

    await new Promise(resolve => setTimeout(resolve, 15000));

    // Esperem que el compte s'hagi creat
    await waitFor(element(by.id('username-button'))).toBeVisible();

    // Login
    await element(by.id('username-input')).typeText(username);
    await element(by.id('password-input')).typeText(password);

    await device.pressBack();
    await new Promise(resolve => setTimeout(resolve, 7000));

    await element(by.id('login-button')).tap();
    
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    await waitFor(element(by.id('home-screen')));
    
    return {
        username,
        email,
        password,
    };
}

module.exports = {
    loginAsNewUser,
};