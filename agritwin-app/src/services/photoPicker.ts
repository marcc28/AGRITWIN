import * as ImagePicker from 'expo-image-picker';

import type { DiagnosisPhoto } from './api_diagnosis';

export type PickedPhoto = DiagnosisPhoto | 'denied' | 'blocked' | null;

export async function choosePhoto(fromCamera: boolean): Promise<PickedPhoto> {
  const permission = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return permission.canAskAgain ? 'denied' : 'blocked';
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
  };
  const picked = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (picked.canceled || picked.assets.length === 0) {
    return null;
  }

  const asset = picked.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    file: asset.file ?? null,
  };
}
