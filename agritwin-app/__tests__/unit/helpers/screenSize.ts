// Window size for the tests that mock useWindowDimensions.

function mockedWindow() {
  return jest.requireMock<{ default: jest.Mock }>(
    'react-native/Libraries/Utilities/useWindowDimensions',
  ).default;
}

export function setWindowSize(width: number, height: number) {
  mockedWindow().mockReturnValue({ width, height, scale: 2, fontScale: 1 });
}

export function resetWindowSize() {
  setWindowSize(375, 812);
}
