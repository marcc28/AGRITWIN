import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import ProfileScreen from '../../../src/app/profile';
import { Colors } from '../../../src/constants/theme';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('../../../src/components/AppHeader', () => () => null);

jest.mock('../../../src/components/GardenPickerOverlay', () => () => null);

jest.mock('../../../src/components/AccountCard', () => {
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return { AccountCard: () => <Text>AccountCard</Text> };
});

const HIDDEN = { includeHiddenElements: true };

const mockedCanGoBack = router.canGoBack as jest.Mock;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the account settings', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('fieldSelection.profile')).toBeTruthy();
    expect(screen.getByText('AccountCard')).toBeTruthy();
  });

  it('shows the plain "no photo" avatar: a person on a green circle', () => {
    render(<ProfileScreen />);

    // It is only a picture, so screen readers skip it.
    const avatar = screen.getByTestId('profile-avatar', HIDDEN);
    expect(avatar.props.style).toMatchObject({
      backgroundColor: Colors.light.primary,
      borderRadius: 30,
    });
    expect(screen.getByText('person', HIDDEN)).toBeTruthy();
    expect(screen.queryByText('🧑‍🌾')).toBeNull();
  });

  it('does not let the user change the avatar', () => {
    render(<ProfileScreen />);

    const avatar = screen.getByTestId('profile-avatar', HIDDEN);
    expect(avatar.props.onPress).toBeUndefined();
    expect(avatar.props.accessibilityRole).toBeUndefined();

    fireEvent.press(avatar);

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('goes back to the previous screen', () => {
    mockedCanGoBack.mockReturnValue(true);
    render(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('profile-back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('opens the field selection when there is no previous screen', () => {
    mockedCanGoBack.mockReturnValue(false);
    render(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('profile-back'));
    expect(router.replace).toHaveBeenCalledWith('/field-selection');
  });
});
