import { Image } from 'react-native';

import { prefetchImages } from '@/services/imagePrefetch';

describe('prefetchImages', () => {
  let prefetch: jest.SpyInstance;

  beforeEach(() => {
    prefetch = jest.spyOn(Image, 'prefetch');
  });

  afterEach(() => {
    prefetch.mockRestore();
  });

  it('downloads each image once and skips empty urls', () => {
    prefetch.mockResolvedValue(true);

    prefetchImages(['https://a/1.png', null, undefined, '', 'https://a/1.png']);

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith('https://a/1.png');
  });

  it('tries again later when a download fails', async () => {
    prefetch.mockRejectedValueOnce(new Error('offline'));
    prefetchImages(['https://a/2.png']);
    await Promise.resolve();
    await Promise.resolve();

    prefetch.mockResolvedValue(true);
    prefetchImages(['https://a/2.png']);

    expect(prefetch).toHaveBeenCalledTimes(2);
  });

  it('ignores a prefetch that throws at once', () => {
    prefetch.mockImplementationOnce(() => {
      throw new Error('not supported');
    });

    expect(() => prefetchImages(['https://a/3.png'])).not.toThrow();

    prefetch.mockResolvedValue(true);
    prefetchImages(['https://a/3.png']);
    expect(prefetch).toHaveBeenCalledTimes(2);
  });
});
