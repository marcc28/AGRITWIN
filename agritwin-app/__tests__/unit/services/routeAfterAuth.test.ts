import { router } from 'expo-router';

import { getFields } from '../../../src/services/api';
import { routeAfterAuth } from '../../../src/services/routeAfterAuth';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('../../../src/services/api', () => ({
  getFields: jest.fn(),
}));

const mockedGetFields = getFields as jest.MockedFunction<typeof getFields>;

describe('routeAfterAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens create field when the user has no gardens', async () => {
    mockedGetFields.mockResolvedValue([]);
    await routeAfterAuth();
    expect(router.replace).toHaveBeenCalledWith('/create-field');
  });

  it('opens home when the user already has a garden', async () => {
    mockedGetFields.mockResolvedValue([
      {
        id: 3,
        name: 'Hort',
        location: null,
        field_type: null,
        soil_type: null,
        size_m2: null,
        device_count: 0,
      },
    ]);
    await routeAfterAuth();
    expect(router.replace).toHaveBeenCalledWith('/app/home');
  });
});
