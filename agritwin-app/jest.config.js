process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

module.exports = {
  preset: 'jest-expo',

  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],

  moduleNameMapper: {
    '^@/global\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/vectorIcons.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
  },
};
