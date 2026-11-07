import React from 'react';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import RecommendationsScreen from '../../../src/app/recommendations/[fieldId]';
import { useFieldRecommendations } from '@/hooks/use-field-recommendations';
import type { Recommendation } from '@/services/api_recommendations';

const mockRouter = { back: jest.fn() };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; count?: number }) =>
      options?.defaultValue ??
      (options?.count != null ? `${key}:${options.count}` : key),
    i18n: { resolvedLanguage: 'ca' },
  }),
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ fieldId: '7' }),
  router: mockRouter,
}));

jest.mock('@/hooks/use-field-recommendations', () => ({
  useFieldRecommendations: jest.fn(),
}));

const mockedUseRecommendations = useFieldRecommendations as jest.MockedFunction<
  typeof useFieldRecommendations
>;

const recommendation: Recommendation = {
  id: 'recommendation-1',
  field_id: 7,
  category: 'irrigation',
  title: 'Revisa el reg',
  description: 'La humitat del sòl és baixa.',
  severity: 'high',
  based_on: {
    reason: 'El sensor ha detectat poca humitat.',
    data: ['Humitat: 18%', 'Temperatura: 29 °C'],
  },
  model: 'test-model',
  generated_at: '2026-05-01T10:00:00Z',
  expires_at: '2026-05-08T10:00:00Z',
};

function setState(
  status: 'loading' | 'success' | 'error',
  data: Recommendation[] = [],
  retry = jest.fn(),
) {
  mockedUseRecommendations.mockReturnValue({ status, data, retry });
  return retry;
}

describe('RecommendationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the field heading and loading state', () => {
    setState('loading');

    render(<RecommendationsScreen />);

    expect(screen.getByText('recommendations.title')).toBeTruthy();
    expect(screen.getByText('recommendations.field #7')).toBeTruthy();
    expect(screen.getByText('recommendations.loading')).toBeTruthy();
    expect(mockedUseRecommendations).toHaveBeenCalledWith('7');
  });

  it('shows an error and retries loading', () => {
    const retry = setState('error');

    render(<RecommendationsScreen />);
    fireEvent.press(screen.getByText('recommendations.retry'));

    expect(screen.getByText('recommendations.loadError')).toBeTruthy();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when no recommendations are returned', () => {
    setState('success');

    render(<RecommendationsScreen />);

    expect(screen.getByText('recommendations.emptyTitle')).toBeTruthy();
    expect(screen.getByText('recommendations.emptyDescription')).toBeTruthy();
  });

  it('renders recommendation cards and their internal content', () => {
    setState('success', [recommendation]);

    render(<RecommendationsScreen />);

    expect(screen.getByText('recommendations.results:1')).toBeTruthy();
    expect(screen.getByText('irrigation')).toBeTruthy();
    expect(screen.getByText('high')).toBeTruthy();
    expect(screen.getByText('Revisa el reg')).toBeTruthy();
    expect(screen.getByText('La humitat del sòl és baixa.')).toBeTruthy();
    expect(
      screen.getByText('El sensor ha detectat poca humitat.'),
    ).toBeTruthy();
    expect(screen.getByText('• Humitat: 18%')).toBeTruthy();
    expect(screen.getByText('• Temperatura: 29 °C')).toBeTruthy();
    expect(screen.getByText(/^recommendations\.generatedAt:/)).toBeTruthy();
    expect(screen.getByText(/^recommendations\.expiresAt:/)).toBeTruthy();
  });

  it('supports multiple cards and missing based-on details', () => {
    const second = {
      ...recommendation,
      id: 'recommendation-2',
      category: 'general',
      severity: 'unlisted-severity',
      title: 'Observa el cultiu',
      based_on: null,
    };
    setState('success', [recommendation, second]);

    render(<RecommendationsScreen />);

    expect(screen.getByText('recommendations.results:2')).toBeTruthy();
    expect(screen.getByText('Observa el cultiu')).toBeTruthy();
    expect(screen.getByText('general')).toBeTruthy();
    expect(screen.getByText('unlisted-severity')).toBeTruthy();
  });

  it('navigates back when the back button is pressed', async () => {
    setState('success');

    render(<RecommendationsScreen />);
    fireEvent.press(screen.getByLabelText('recommendations.back'));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });
});
