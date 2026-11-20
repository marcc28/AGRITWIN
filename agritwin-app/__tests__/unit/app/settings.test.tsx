import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import SettingsScreen from '../../../src/app/app/crops';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../../../src/hooks/use-current-field', () => ({
  useCurrentField: () => ({ id: 3, name: 'Hort' }),
}));

jest.mock('../../../src/hooks/use-field-crops', () => ({
  useFieldCrops: () => ({ status: 'success', data: [], retry: jest.fn() }),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only shows the crops of the current garden', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('settings.title')).toBeTruthy();
    expect(screen.queryByText('settings.profile')).toBeNull();
    expect(screen.queryByText('settings.logout')).toBeNull();
  });

  it('opens crop entry for the current garden', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByLabelText('settings.manageCrops.addCrop'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/edit-field',
      params: { id: '3', addCrop: 'true' },
    });
  });
});
