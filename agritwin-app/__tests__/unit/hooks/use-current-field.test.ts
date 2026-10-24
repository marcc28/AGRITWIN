import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCurrentField } from '../../../src/hooks/use-current-field';
import {
  getCurrentField,
  subscribeCurrentField,
} from '../../../src/services/currentField';

jest.mock('../../../src/services/currentField', () => ({
  getCurrentField: jest.fn(),
  subscribeCurrentField: jest.fn(),
}));

const mockedGetCurrentField = getCurrentField as jest.MockedFunction<
  typeof getCurrentField
>;
const mockedSubscribe = subscribeCurrentField as jest.MockedFunction<
  typeof subscribeCurrentField
>;

describe('useCurrentField', () => {
  let listener: () => void = () => undefined;
  const unsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubscribe.mockImplementation((next) => {
      listener = next;
      return unsubscribe;
    });
  });

  it('is undefined until the field is read', async () => {
    mockedGetCurrentField.mockResolvedValue({ id: 1, name: 'Hort' });

    const { result } = renderHook(() => useCurrentField());

    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current).toEqual({ id: 1, name: 'Hort' });
    });
  });

  it('is null when there is no field', async () => {
    mockedGetCurrentField.mockResolvedValue(null);

    const { result } = renderHook(() => useCurrentField());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('is null when the field cannot be read', async () => {
    mockedGetCurrentField.mockRejectedValue(new Error('storage'));

    const { result } = renderHook(() => useCurrentField());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('follows the field chosen in the header', async () => {
    mockedGetCurrentField.mockResolvedValueOnce({ id: 1, name: 'Hort' });

    const { result } = renderHook(() => useCurrentField());

    await waitFor(() => {
      expect(result.current).toEqual({ id: 1, name: 'Hort' });
    });

    mockedGetCurrentField.mockResolvedValueOnce({ id: 2, name: 'Tremp' });
    await act(async () => {
      listener();
    });

    expect(result.current).toEqual({ id: 2, name: 'Tremp' });
  });

  it('stops listening when it is removed', async () => {
    mockedGetCurrentField.mockResolvedValue({ id: 1, name: 'Hort' });

    const { result, unmount } = renderHook(() => useCurrentField());

    await waitFor(() => {
      expect(result.current).toEqual({ id: 1, name: 'Hort' });
    });
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
