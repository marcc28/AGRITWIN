import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CropDetailScreen from '@/app/crop-detail';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { router } from 'expo-router';

let mockParams: { id?: string | string[] } = { id: '7' };
let mockQueryResult: Record<string, unknown> = {};

jest.mock('@/hooks/use-cached-query', () => ({
  useCachedQuery: jest.fn(() => mockQueryResult),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/FieldCropsSection', () => ({
  FieldCropsSection: ({ fieldId }: { fieldId: number }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Text } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(Text, null, `field-crops-${fieldId}`);
  },
}));

const mockedUseCachedQuery = useCachedQuery as jest.MockedFunction<
  typeof useCachedQuery
>;

describe('CropDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: '7' };
    mockQueryResult = {
      data: undefined,
      error: null,
      isError: false,
    };
  });

  it('shows an invalid id and disables the field query', () => {
    mockParams = { id: 'bad-id' };

    render(<CropDetailScreen />);

    expect(screen.getByText('settings.errors.invalidId')).toBeTruthy();
    expect(mockedUseCachedQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('shows loading while a valid field is being fetched', () => {
    render(<CropDetailScreen />);

    expect(screen.getByText('settings.loading')).toBeTruthy();
    expect(mockedUseCachedQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('shows a field and its crops, then opens edit and back routes', () => {
    mockQueryResult = {
      data: { id: 7, name: 'Hort' },
      error: null,
      isError: false,
    };

    render(<CropDetailScreen />);

    expect(screen.getByText('Hort')).toBeTruthy();
    expect(screen.getByText('field-crops-7')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('settings.manageCrops.editCrops'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/editar_crops',
      params: { id: '7' },
    });

    fireEvent.press(screen.getByText('settings.manageCrops.back'));
    expect(router.replace).toHaveBeenCalledWith('/app/crops');
  });

  it('shows the original field loading error', () => {
    mockQueryResult = {
      data: undefined,
      error: new Error('Field unavailable'),
      isError: true,
    };

    render(<CropDetailScreen />);

    expect(screen.getByText('Field unavailable')).toBeTruthy();
    expect(screen.queryByText('settings.loading')).toBeNull();
  });

  it('uses a fallback when the field request fails without an Error', () => {
    mockQueryResult = {
      data: undefined,
      error: 'offline',
      isError: true,
    };

    render(<CropDetailScreen />);

    expect(screen.getByText('settings.errors.loadGarden')).toBeTruthy();
  });

  it('accepts array route params', () => {
    mockParams = { id: ['9', '10'] };
    mockQueryResult = {
      data: { id: 9, name: 'Camp nou' },
      error: null,
      isError: false,
    };

    render(<CropDetailScreen />);

    expect(screen.getByText('Camp nou')).toBeTruthy();
    expect(screen.getByText('field-crops-9')).toBeTruthy();
  });
});
