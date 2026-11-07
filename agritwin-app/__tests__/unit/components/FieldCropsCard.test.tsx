import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FieldCropsCard } from '@/components/FieldCropsCard';
import { FieldCropsCard as RecommendationCropsCard } from '@/components/FieldCropsCardRecomendation';
import type { FieldCrop } from '@/services/api_fieldCrops';
import { router } from 'expo-router';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { id?: string | number; defaultValue?: string },
    ) =>
      key === 'fieldCrops.crop'
        ? `Crop ${options?.id}`
        : (options?.defaultValue ?? key),
    i18n: { resolvedLanguage: 'ca' },
  }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const crop: FieldCrop = {
  id: 2,
  field_id: 8,
  crop_id: 4,
  crop_name: 'Ordi',
  planted_at: '2026-01-01',
  expected_harvest_at: '2026-06-01',
  status: 'planted',
};

describe('field crop cards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders loading and error states, retries, and disables add', () => {
    const retry = jest.fn();
    const add = jest.fn();
    const loading = render(
      <FieldCropsCard
        state={{ status: 'loading', data: [] }}
        onRetry={retry}
        onAdd={add}
        addDisabled
      />,
    );
    expect(loading.getByText('fieldCrops.title')).toBeTruthy();
    loading.unmount();

    render(
      <FieldCropsCard
        state={{ status: 'error', data: [] }}
        onRetry={retry}
        onAdd={add}
      />,
    );
    fireEvent.press(screen.getByText('fieldCrops.retry'));
    fireEvent.press(screen.getByLabelText('settings.manageCrops.addCrop'));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
    expect(screen.getByText('fieldCrops.loadError')).toBeTruthy();
  });

  it('renders empty and populated crops and opens field recommendations', () => {
    const add = jest.fn();
    const empty = render(
      <FieldCropsCard
        state={{ status: 'success', data: [] }}
        onRetry={jest.fn()}
        onAdd={add}
      />,
    );
    expect(empty.getByText('fieldCrops.empty')).toBeTruthy();
    empty.unmount();

    render(
      <FieldCropsCard
        state={{
          status: 'success',
          data: [
            crop,
            {
              ...crop,
              id: 3,
              crop_name: null,
              planted_at: null,
              expected_harvest_at: null,
            },
          ],
        }}
        onRetry={jest.fn()}
        onAdd={add}
      />,
    );
    expect(screen.getByText('Ordi')).toBeTruthy();
    expect(screen.getByText('Crop 4')).toBeTruthy();
    expect(
      screen.getByText('fieldCrops.expectedHarvest: 1/6/2026'),
    ).toBeTruthy();
    expect(screen.getByText(/fieldCrops.noDate/)).toBeTruthy();
    fireEvent.press(screen.getAllByLabelText('recommendations.open')[0]);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/recommendations/[fieldId]',
      params: { fieldId: '8' },
    });
  });

  it('renders recommendation crop details without interaction', () => {
    render(
      <RecommendationCropsCard
        state={{ status: 'success', data: [crop] }}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText('Ordi')).toBeTruthy();
    expect(screen.getByText('fieldCrops.status: planted')).toBeTruthy();
  });

  it('renders all recommendation card states and retries errors', () => {
    const retry = jest.fn();
    const loading = render(
      <RecommendationCropsCard
        state={{ status: 'loading', data: [] }}
        onRetry={retry}
      />,
    );
    expect(loading.getByText('fieldCrops.title')).toBeTruthy();
    loading.unmount();

    const error = render(
      <RecommendationCropsCard
        state={{ status: 'error', data: [] }}
        onRetry={retry}
      />,
    );
    fireEvent.press(error.getByText('fieldCrops.retry'));
    expect(retry).toHaveBeenCalledTimes(1);
    error.unmount();

    render(
      <RecommendationCropsCard
        state={{ status: 'success', data: [] }}
        onRetry={retry}
      />,
    );
    expect(screen.getByText('fieldCrops.empty')).toBeTruthy();
  });
});
