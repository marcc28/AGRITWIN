import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { OptionChip } from '../../../src/components/OptionChip';

describe('OptionChip', () => {
  it('calls onPress and marks the selected chip', () => {
    const onPress = jest.fn();
    render(
      <OptionChip
        label="Català"
        selected
        onPress={onPress}
        style={{}}
        selectedStyle={{}}
        textStyle={{}}
        selectedTextStyle={{}}
      />,
    );
    fireEvent.press(screen.getByText('Català'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not press when disabled', () => {
    const onPress = jest.fn();
    render(
      <OptionChip
        label="Català"
        selected={false}
        onPress={onPress}
        disabled
        style={{}}
        selectedStyle={{}}
        textStyle={{}}
        selectedTextStyle={{}}
      />,
    );
    fireEvent.press(screen.getByText('Català'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
