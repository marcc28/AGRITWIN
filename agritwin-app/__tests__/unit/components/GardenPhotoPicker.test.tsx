import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import { GardenPhotoPicker } from '../../../src/components/GardenPhotoPicker';

describe('GardenPhotoPicker', () => {
  it('changes the selected photo', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <GardenPhotoPicker
        photoIndex={0}
        onChange={onChange}
        disabled={false}
        photoStyle={{}}
      />,
    );
    fireEvent.press(getByLabelText('field'));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
