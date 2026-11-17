import { router } from 'expo-router';

import { leaveAddDevice, parseOrigin } from '@/utils/addDeviceNavigation';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

const mockedCanGoBack = router.canGoBack as jest.Mock;

describe('parseOrigin', () => {
  it('knows the three places the flow can start from', () => {
    expect(parseOrigin('home')).toBe('home');
    expect(parseOrigin('edit-field')).toBe('edit-field');
    expect(parseOrigin('field-detail')).toBe('field-detail');
  });

  it('takes the first value of a list', () => {
    expect(parseOrigin(['edit-field', 'home'])).toBe('edit-field');
  });

  it('uses the field screen for anything else', () => {
    expect(parseOrigin(undefined)).toBe('field-detail');
    expect(parseOrigin('somewhere')).toBe('field-detail');
    expect(parseOrigin([])).toBe('field-detail');
  });
});

describe('leaveAddDevice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCanGoBack.mockReturnValue(true);
  });

  it('goes to the field screen by default', () => {
    leaveAddDevice(7, 'field-detail');

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/field-detail',
      params: { id: '7' },
    });
  });

  it('goes home after creating the first garden', () => {
    leaveAddDevice(7, 'home');

    expect(router.replace).toHaveBeenCalledWith('/app/home');
  });

  it('goes back to the edit screen so the typed text is kept', () => {
    leaveAddDevice(7, 'edit-field');

    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('opens the edit screen again when there is nothing to go back to', () => {
    mockedCanGoBack.mockReturnValue(false);

    leaveAddDevice(7, 'edit-field');

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/edit-field',
      params: { id: '7' },
    });
  });
});
