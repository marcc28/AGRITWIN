// Shared test setup: every test starts with an empty data cache.

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);

// Cache updates reach components right away, as React state updates do.
jest
  .requireActual('@tanstack/react-query')
  .notifyManager.setScheduler((callback: () => void) => callback());

// No garbage-collection timers in tests: a 24 h timer would keep Jest alive.
const { queryClient } = jest.requireActual('./src/services/queryClient');
queryClient.setDefaultOptions({
  ...queryClient.getDefaultOptions(),
  queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity },
});

function resetInMemoryCaches() {
  jest.requireActual('./src/services/queryClient').queryClient.clear();
  jest.requireActual('./src/services/auth').resetAuthCache();
  jest.requireActual('./src/services/currentField').resetCurrentFieldCache();
}

beforeEach(resetInMemoryCaches);
afterEach(resetInMemoryCaches);
