import React from 'react';

import { render, waitFor } from '@testing-library/react-native';

import { FieldPhoto } from '../../../src/components/FieldPhoto';
import { getFieldPhotoIndex } from '../../../src/services/fieldPhoto';

jest.mock('../../../src/services/fieldPhoto', () => ({
  getFieldPhotoIndex: jest.fn(async () => 1),
  subscribeFieldPhotos: jest.fn(() => () => undefined),
}));

describe('FieldPhoto', () => {
  it('loads the stored photo index', async () => {
    render(<FieldPhoto fieldId={3} />);
    await waitFor(() => {
      expect(getFieldPhotoIndex).toHaveBeenCalledWith(3);
    });
  });
});
