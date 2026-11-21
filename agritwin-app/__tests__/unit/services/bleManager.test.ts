const mockConstructor = jest.fn();

jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn().mockImplementation(() => {
    mockConstructor();
    return { kind: 'fake-manager' };
  }),
}));

describe('getBleManager', () => {
  it('creates the manager once and reuses it', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getBleManager } = require('@/services/bleManager');

      const first = getBleManager();
      const second = getBleManager();

      expect(first).toBe(second);
      expect(mockConstructor).toHaveBeenCalledTimes(1);
    });
  });
});
