import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

import { setupAppFocusRefetch } from '@/services/appFocus';

describe('setupAppFocusRefetch', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOS,
    });
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
  });

  it('tells the cache when the app goes to background and back', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const remove = jest.fn();
    let listener: (status: string) => void = () => undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        listener = handler as (status: string) => void;
        return { remove } as unknown as ReturnType<
          typeof AppState.addEventListener
        >;
      });

    const stop = setupAppFocusRefetch();

    listener('background');
    expect(focusManager.isFocused()).toBe(false);
    listener('active');
    expect(focusManager.isFocused()).toBe(true);

    stop();
    expect(remove).toHaveBeenCalled();
  });

  it('leaves focus handling to the browser on web', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const addListener = jest.spyOn(AppState, 'addEventListener');
    addListener.mockClear();

    const stop = setupAppFocusRefetch();
    stop();

    expect(addListener).not.toHaveBeenCalled();
  });
});
