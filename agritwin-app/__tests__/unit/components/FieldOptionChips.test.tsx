import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { FieldOptionChips } from '../../../src/components/FieldOptionChips';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('FieldOptionChips', () => {
  it('changes field type and soil', () => {
    const onFieldType = jest.fn();
    const onSoilType = jest.fn();
    render(
      <FieldOptionChips
        fieldType="home_garden"
        soilType="loam"
        onFieldType={onFieldType}
        onSoilType={onSoilType}
        disabled={false}
      />,
    );
    fireEvent.press(screen.getByText('settings.fieldTypes.open_field'));
    expect(onFieldType).toHaveBeenCalledWith('open_field');
    fireEvent.press(screen.getByText('settings.soilTypes.clay'));
    expect(onSoilType).toHaveBeenCalledWith('clay');
  });
});
