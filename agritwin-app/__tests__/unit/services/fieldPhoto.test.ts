import {
  getFieldPhotoIndex,
  setFieldPhotoIndex,
  subscribeFieldPhotos,
} from '../../../src/services/fieldPhoto';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe('fieldPhoto', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('returns the default index when nothing is stored', async () => {
    await expect(getFieldPhotoIndex(3)).resolves.toBe(3);
  });

  it('stores and reads a photo index', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeFieldPhotos(listener);

    await setFieldPhotoIndex(3, 1);
    await expect(getFieldPhotoIndex(3)).resolves.toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('ignores invalid stored json', async () => {
    mockStore.set('agritwin_field_photos', '{bad');
    await expect(getFieldPhotoIndex(2)).resolves.toBe(2);
  });
});
