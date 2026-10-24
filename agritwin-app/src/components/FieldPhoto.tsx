import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { defaultPhotoIndex, gardenPhotoAt } from '../constants/gardenPhotos';
import {
  getFieldPhotoIndex,
  subscribeFieldPhotos,
} from '../services/fieldPhoto';

type Props = Readonly<{
  fieldId: number;
  style?: StyleProp<ImageStyle>;
}>;

export function FieldPhoto({ fieldId, style }: Props) {
  const [index, setIndex] = useState(defaultPhotoIndex(fieldId));

  useEffect(() => {
    let live = true;

    async function load() {
      const next = await getFieldPhotoIndex(fieldId);
      if (live) {
        setIndex(next);
      }
    }

    void load();
    return subscribeFieldPhotos(() => {
      void load();
    });
  }, [fieldId]);

  return (
    <Image source={gardenPhotoAt(index)} style={style} resizeMode="cover" />
  );
}
