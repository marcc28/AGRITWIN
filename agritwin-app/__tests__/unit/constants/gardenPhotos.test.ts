import {
  GARDEN_PHOTOS,
  defaultPhotoIndex,
  gardenPhotoAt,
} from '../../../src/constants/gardenPhotos';

describe('gardenPhotos', () => {
  it('keeps photo indexes inside the list', () => {
    expect(defaultPhotoIndex(0)).toBe(0);
    expect(defaultPhotoIndex(3)).toBe(3);
    expect(defaultPhotoIndex(5)).toBe(0);
    expect(defaultPhotoIndex(Number.NaN)).toBe(0);
  });

  it('returns a photo for any index', () => {
    expect(gardenPhotoAt(0)).toBe(GARDEN_PHOTOS[0]);
    expect(gardenPhotoAt(GARDEN_PHOTOS.length)).toBe(GARDEN_PHOTOS[0]);
  });
});
