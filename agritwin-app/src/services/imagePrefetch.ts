import { Image } from 'react-native';

const requested = new Set<string>();

/**
 * Downloads remote images into the phone's image cache before they are
 * shown, so opening a product shows its photo at once. Each URL is asked
 * only once per session; failures are ignored (the image simply loads
 * when it is displayed, as before).
 */
export function prefetchImages(urls: (string | null | undefined)[]): void {
  for (const url of urls) {
    if (!url || requested.has(url)) {
      continue;
    }
    requested.add(url);
    // Started inside a promise chain so a synchronous throw of
    // Image.prefetch also ends in the catch below.
    Promise.resolve()
      .then(() => Image.prefetch(url))
      .catch(() => {
        requested.delete(url);
      });
  }
}
