import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecommendationCard } from '@/components/tasks/RecommendationCard';
import type { GardenRecommendation } from '@/services/api';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const item: GardenRecommendation = {
  id: 6,
  title: 'Nit de gelada',
  details: 'Tapa les plantes',
  due_on: '2026-11-11',
  signature: 'frost',
};

describe('RecommendationCard', () => {
  it('shows the notice and its two actions', () => {
    const onSeen = jest.fn();
    const onConvert = jest.fn();
    render(
      <RecommendationCard item={item} onSeen={onSeen} onConvert={onConvert} />,
    );

    expect(screen.getByText('Nit de gelada')).toBeTruthy();
    expect(screen.getByText('Tapa les plantes')).toBeTruthy();

    fireEvent.press(screen.getByTestId('recommendation-seen-6'));
    expect(onSeen).toHaveBeenCalledWith(item);
    expect(onConvert).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('recommendation-convert-6'));
    expect(onConvert).toHaveBeenCalledWith(item);
  });

  it('works without details', () => {
    render(
      <RecommendationCard
        item={{ ...item, details: null }}
        onSeen={jest.fn()}
        onConvert={jest.fn()}
      />,
    );

    expect(screen.getByText('Nit de gelada')).toBeTruthy();
    expect(screen.queryByText('Tapa les plantes')).toBeNull();
  });
});
