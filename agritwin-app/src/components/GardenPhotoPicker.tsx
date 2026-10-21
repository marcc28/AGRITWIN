import {
  Image,
  Pressable,
  type StyleProp,
  type ImageStyle,
  View,
} from 'react-native';

import {
  GARDEN_PHOTO_IDS,
  GARDEN_PHOTOS,
  gardenPhotoAt,
} from '../constants/gardenPhotos';
import { styles } from '../styles/garden-photo-picker.styles';

export function GardenPhotoPicker({
  photoIndex,
  onChange,
  disabled,
  photoStyle,
}: Readonly<{
  photoIndex: number;
  onChange: (index: number) => void;
  disabled: boolean;
  photoStyle: StyleProp<ImageStyle>;
}>) {
  return (
    <>
      <Image
        source={gardenPhotoAt(photoIndex)}
        style={photoStyle}
        resizeMode="cover"
      />
      <View style={styles.row}>
        {GARDEN_PHOTOS.map((_, index) => (
          <Pressable
            key={GARDEN_PHOTO_IDS[index]}
            accessibilityLabel={GARDEN_PHOTO_IDS[index]}
            onPress={() => onChange(index)}
            disabled={disabled}
            style={[
              styles.thumbWrap,
              photoIndex === index ? styles.thumbSelected : null,
            ]}
          >
            <Image
              source={gardenPhotoAt(index)}
              style={styles.thumb}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </View>
    </>
  );
}
