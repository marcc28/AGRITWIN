import type { ImageSourcePropType } from 'react-native';

export const GARDEN_PHOTOS: ImageSourcePropType[] = [
  require('@assets/images/garden-home.jpg'),
  require('@assets/images/garden-field.jpg'),
  require('@assets/images/garden-greenhouse.jpg'),
  require('@assets/images/garden-orchard.jpg'),
  require('@assets/images/garden-herbs.jpg'),
];

export function defaultPhotoIndex(fieldId: number): number {
  if (!Number.isFinite(fieldId)) {
    return 0;
  }
  const count = GARDEN_PHOTOS.length;
  return ((fieldId % count) + count) % count;
}

export function gardenPhotoAt(index: number): ImageSourcePropType {
  const safe =
    ((index % GARDEN_PHOTOS.length) + GARDEN_PHOTOS.length) %
    GARDEN_PHOTOS.length;
  return GARDEN_PHOTOS[safe];
}
