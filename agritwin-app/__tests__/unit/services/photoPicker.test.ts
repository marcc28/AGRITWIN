import * as ImagePicker from 'expo-image-picker';

import { choosePhoto } from '../../../src/services/photoPicker';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

function permission(granted: boolean, canAskAgain = true) {
  return { granted, canAskAgain } as ImagePicker.PermissionResponse;
}

describe('photo picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    picker.requestCameraPermissionsAsync.mockResolvedValue(permission(true));
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(
      permission(true),
    );
  });

  it('asks for the camera permission and returns the photo', async () => {
    picker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///camera.jpg', mimeType: 'image/jpeg' }],
    } as ImagePicker.ImagePickerResult);

    await expect(choosePhoto(true)).resolves.toEqual({
      uri: 'file:///camera.jpg',
      mimeType: 'image/jpeg',
      file: null,
    });
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalled();
  });

  it('returns denied when the permission can be asked again', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(
      permission(false, true),
    );

    await expect(choosePhoto(true)).resolves.toBe('denied');
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns blocked when the gallery permission cannot be asked again', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(
      permission(false, false),
    );

    await expect(choosePhoto(false)).resolves.toBe('blocked');
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns null when the user cancels', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    } as ImagePicker.ImagePickerResult);

    await expect(choosePhoto(false)).resolves.toBeNull();
  });
});
