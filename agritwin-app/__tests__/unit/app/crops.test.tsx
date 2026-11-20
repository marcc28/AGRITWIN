import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CropsScreen from '@/app/app/crops';
import { router } from 'expo-router';
import { useCurrentField } from '@/hooks/use-current-field';
import { useInfiniteFieldCrops } from '@/hooks/use-infinite-field-crops';

let mockField: { id: number; name: string } | null = { id: 7, name: 'Hort' };
let mockCropList: Record<string, unknown>;

jest.mock('@/hooks/use-current-field', () => ({
  useCurrentField: jest.fn(() => mockField),
}));

jest.mock('@/hooks/use-infinite-field-crops', () => ({
  useInfiniteFieldCrops: jest.fn(() => mockCropList),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/FieldCropsCard', () => ({
  FieldCropsCard: ({
    onAdd,
    onEdit,
  }: {
    onAdd: () => void;
    onEdit: () => void;
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(
      View,
      null,
      React.createElement(
        Pressable,
        { testID: 'add-crop', onPress: onAdd },
        React.createElement(Text, null, 'Add crop'),
      ),
      React.createElement(
        Pressable,
        { testID: 'edit-crops', onPress: onEdit },
        React.createElement(Text, null, 'Edit crops'),
      ),
    );
  },
}));

const mockedUseCurrentField = useCurrentField as jest.MockedFunction<
  typeof useCurrentField
>;
const mockedUseInfiniteCrops = useInfiniteFieldCrops as jest.MockedFunction<
  typeof useInfiniteFieldCrops
>;

describe('CropsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockField = { id: 7, name: 'Hort' };
    mockCropList = {
      status: 'success',
      data: [],
      retry: jest.fn(),
      loadMore: jest.fn(),
      hasMore: true,
      loadingMore: false,
    };
  });

  it('loads the infinite crop query for the selected field', () => {
    render(<CropsScreen />);

    expect(mockedUseInfiniteCrops).toHaveBeenCalledWith(7);
  });

  it('routes to add and detail screens for the selected field', () => {
    render(<CropsScreen />);

    fireEvent.press(screen.getByTestId('add-crop'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/editar_crops',
      params: { id: '7' },
    });

    fireEvent.press(screen.getByTestId('edit-crops'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/crop-detail',
      params: { id: '7' },
    });
  });

  it('does not request another page until scrolling near the bottom', () => {
    render(<CropsScreen />);
    const scroll = screen.getByTestId('crops-scroll-view');
    const loadMore = mockCropList.loadMore as jest.Mock;

    scroll.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
    scroll.props.onContentSizeChange(320, 1000);
    expect(loadMore).not.toHaveBeenCalled();

    scroll.props.onScroll({
      nativeEvent: {
        contentOffset: { y: 400 },
      },
    });
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('fills a short screen automatically and avoids duplicate page requests', () => {
    render(<CropsScreen />);
    const scroll = screen.getByTestId('crops-scroll-view');
    const loadMore = mockCropList.loadMore as jest.Mock;

    scroll.props.onLayout({ nativeEvent: { layout: { height: 600 } } });
    scroll.props.onContentSizeChange(320, 400);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('does not load when there are no more pages or a page is loading', () => {
    mockCropList = {
      ...mockCropList,
      hasMore: false,
    };
    const { rerender } = render(<CropsScreen />);
    const scroll = screen.getByTestId('crops-scroll-view');
    scroll.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
    scroll.props.onContentSizeChange(320, 1000);
    scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 900 } } });
    expect(mockCropList.loadMore).not.toHaveBeenCalled();

    mockCropList = { ...mockCropList, hasMore: true, loadingMore: true };
    rerender(<CropsScreen />);
    const updatedScroll = screen.getByTestId('crops-scroll-view');
    updatedScroll.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
    updatedScroll.props.onContentSizeChange(320, 1000);
    updatedScroll.props.onScroll({
      nativeEvent: { contentOffset: { y: 900 } },
    });
    expect(mockCropList.loadMore).not.toHaveBeenCalled();
  });

  it('handles the absence of a selected field', () => {
    mockField = null;

    render(<CropsScreen />);

    expect(mockedUseCurrentField).toHaveReturnedWith(null);
    expect(mockedUseInfiniteCrops).toHaveBeenCalledWith(null);
    fireEvent.press(screen.getByTestId('edit-crops'));
    expect(router.push).not.toHaveBeenCalled();
  });
});
