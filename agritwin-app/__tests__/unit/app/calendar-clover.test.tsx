import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CloverScreen from '@/app/app/clover';

jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ background: '#fff', text: '#000' }),
}));
jest.mock('@/components/external-link', () => ({
  ExternalLink: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/themed-text', () => ({
  ThemedText: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement(
      require('react-native').Text,
      null,
      children,
    ),
}));
jest.mock('@/components/themed-view', () => ({
  ThemedView: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement(
      require('react-native').View,
      null,
      children,
    ),
}));
jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) =>
    require('react').createElement(
      require('react-native').View,
      null,
      require('react').createElement(require('react-native').Text, null, title),
      children,
    ),
}));
jest.mock('@/components/web-badge', () => ({ WebBadge: () => null }));

const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'OS',
);

afterEach(() => {
  if (originalPlatformDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
  }
});

// The calendar tab now shows the garden tasks. Its tests are in
// calendar.test.tsx. This file keeps covering the clover tab, which still
// shows the shared explore content.
describe('clover tab', () => {
  it('shows the shared explore content', () => {
    render(<CloverScreen />);
    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByText('Images')).toBeTruthy();
    expect(screen.getByText('Animations')).toBeTruthy();
    fireEvent.press(screen.getByText('Expo documentation'));
  });

  it('renders its web layout', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    render(<CloverScreen />);
    expect(screen.getByText('Explore')).toBeTruthy();
  });
});
