const { device } = require('detox');
const { signupNewUser } = require('./helpers/auth');

describe('Signup', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('creates an account', async () => {
    await signupNewUser();
  });
});
