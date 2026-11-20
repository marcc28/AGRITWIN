import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ManageFieldCropsScreen from '@/app/editar_crops';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from '@/services/auth';
import { createFieldCrop, deleteFieldCrop } from '@/services/api_fieldCrops';
import { getCrops } from '@/services/api_crops';
import { queryClient } from '@/services/queryClient';

jest.mock('react-i18next', () => ({
  useTranslation: (() => {
    const mockTranslate = (key: string) => key;
    return () => ({ t: mockTranslate });
  })(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: '3' })),
}));

jest.mock('@/services/auth', () => ({ getAuth: jest.fn() }));
jest.mock('@/services/api_fieldCrops', () => ({
  createFieldCrop: jest.fn(),
  deleteFieldCrop: jest.fn(),
}));
jest.mock('@/services/api_crops', () => ({ getCrops: jest.fn() }));
jest.mock('@/services/queries', () => ({
  fieldCropsQuery: (id: number) => ({ queryKey: ['field-crops', id] }),
}));
jest.mock('@/services/queryClient', () => ({
  queryClient: { query: jest.fn() },
}));
jest.mock('@/components/FieldCropForm', () => {
  const { View: MockView, Text: MockText, Pressable: MockPressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return { FieldCropForm: (props: {
    existingCrops: Array<{ id: number | string; crop_name?: string }>;
    setSelectedCropId: (value: string) => void;
    setSelectedCropName: (value: string) => void;
    setPlantedAt: (value: string) => void;
    setExpectedHarvestAt: (value: string) => void;
    setCropNotes: (value: string) => void;
    onLoadMore: () => void;
    onAdd: () => void;
    showCropForm: boolean;
    setShowCropForm: (value: boolean) => void;
    onShowCropForm: () => void;
  }) => (
    <MockView>
      {props.existingCrops.map((crop) => (
        <MockText key={String(crop.id)}>{crop.crop_name ?? `crop-${crop.id}`}</MockText>
      ))}
      <MockPressable testID="load-next-page" onPress={props.onLoadMore}>
        <MockText>Load next crop page</MockText>
      </MockPressable>
      <MockPressable
        testID="draft-valid"
        onPress={() => {
          props.setSelectedCropId('9');
          props.setSelectedCropName('Tomàquet');
          props.setPlantedAt('2026-04-01');
          props.setExpectedHarvestAt('2026-08-01');
          props.setCropNotes(' notes ');
        }}
      >
        <MockText>Prepare draft</MockText>
      </MockPressable>
      <MockPressable testID="draft-invalid" onPress={() => props.setPlantedAt('bad')}>
        <MockText>Prepare invalid draft</MockText>
      </MockPressable>
      <MockPressable testID="submit-crop" onPress={props.onAdd}>
        <MockText>Submit crop</MockText>
      </MockPressable>
      {props.showCropForm ? (
        <MockPressable testID="collapse-form" onPress={() => props.setShowCropForm(false)}>
          <MockText>Collapse form</MockText>
        </MockPressable>
      ) : (
        <MockPressable testID="show-crop-form" onPress={props.onShowCropForm}>
          <MockText>Show crop form</MockText>
        </MockPressable>
      )}
    </MockView>
  ), };
});

const mockedParams = useLocalSearchParams as jest.Mock;

describe('editar crops screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParams.mockReturnValue({ id: '3' });
    (getAuth as jest.Mock).mockResolvedValue({ token: 'token' });
    (queryClient.query as jest.Mock).mockResolvedValue([
      { id: 21, field_id: 3, crop_id: 2, crop_name: 'Ceba' },
    ]);
    (getCrops as jest.Mock).mockResolvedValue([{ id: 9, name: 'Tomàquet' }]);
    (createFieldCrop as jest.Mock).mockResolvedValue({
      id: 22,
      field_id: 3,
      crop_id: 9,
      crop_name: 'Tomàquet',
    });
    (deleteFieldCrop as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads the crop list and saves then returns to crop detail', async () => {
    render(<ManageFieldCropsScreen />);
    expect((await screen.findAllByText('Ceba')).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId('draft-valid'));
    fireEvent.press(screen.getByTestId('submit-crop'));
    await waitFor(() => expect(createFieldCrop).toHaveBeenCalledWith(
      {
        field_id: 3,
        crop_id: 9,
        planted_at: '2026-04-01',
        expected_harvest_at: '2026-08-01',
        status: 'planted',
        notes: 'notes',
      },
      'token',
    ));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/crop-detail',
      params: { id: '3' },
    });
  });

  it('validates dates before sending a create request', async () => {
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByTestId('draft-invalid'));
    fireEvent.press(screen.getByTestId('submit-crop'));
    expect(await screen.findByText('settings.manageCrops.errors.invalidDate')).toBeTruthy();
    expect(createFieldCrop).not.toHaveBeenCalled();
  });

  it('reports invalid field ids without loading data', async () => {
    mockedParams.mockReturnValue({ id: 'invalid' });
    render(<ManageFieldCropsScreen />);
    expect(await screen.findByText('settings.errors.invalidId')).toBeTruthy();
    expect(getAuth).not.toHaveBeenCalled();
  });

  it('shows an authentication error when no access token is stored', async () => {
    (getAuth as jest.Mock).mockResolvedValue(null);
    render(<ManageFieldCropsScreen />);
    expect(await screen.findByText('No s’ha trobat el token d’autenticació')).toBeTruthy();
    expect(getCrops).not.toHaveBeenCalled();
  });

  it('rolls back an optimistic add when the API fails', async () => {
    (createFieldCrop as jest.Mock).mockRejectedValue(new Error('create failed'));
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByTestId('draft-valid'));
    fireEvent.press(screen.getByTestId('submit-crop'));
    expect(await screen.findByText('create failed')).toBeTruthy();
    expect(screen.queryByText('Tomàquet')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('loads the next catalog page and appends the results', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `Crop ${index + 1}`,
    }));
    (getCrops as jest.Mock)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([{ id: 51, name: 'Crop 51' }]);
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByTestId('load-next-page'));
    await waitFor(() => expect(getCrops).toHaveBeenLastCalledWith(50, 50, 'token'));
  });

  it('stops pagination and displays an error when the next page fails', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({ id: index + 1, name: `Crop ${index + 1}` }));
    (getCrops as jest.Mock)
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce(new Error('page failed'));
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByTestId('load-next-page'));
    expect(await screen.findByText('page failed')).toBeTruthy();
  });

  it('returns to crop detail from the back control', async () => {
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByText('settings.manageCrops.back'));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/crop-detail', params: { id: '3' } });
  });

  it('reopens the crop form from its collapsed state', async () => {
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByTestId('collapse-form'));
    fireEvent.press(screen.getByTestId('show-crop-form'));
    expect(screen.getByTestId('collapse-form')).toBeTruthy();
  });

  it('optimistically removes a crop and restores it after a delete failure', async () => {
    (deleteFieldCrop as jest.Mock).mockRejectedValue(new Error('delete failed'));
    render(<ManageFieldCropsScreen />);
    await screen.findAllByText('Ceba');
    fireEvent.press(screen.getByRole('button', { name: 'settings.manageCrops.removeCrop' }));
    expect(await screen.findByText('delete failed')).toBeTruthy();
    expect(screen.getAllByText('Ceba').length).toBeGreaterThan(0);
  });
});
