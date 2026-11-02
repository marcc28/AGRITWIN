import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';

import NewsDetailScreen from '../../../src/app/news/[id]';
import { getNewsById } from '@/services/api_market';

const mockBack = jest.fn();
let mockId: string | string[] = '1';

jest.mock('@/services/api_market', () => ({
  getNewsById: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    id: mockId,
  }),
}));

const mockNews = {
  id: 1,
  title: 'Notícia de prova',
  subtile: 'Subtítol de prova',
  agent: 'Agent de prova',
  content: 'Contingut complet de la notícia',
  image_url: 'https://example.com/news.png',
};

describe('NewsDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockId = '1';
    (getNewsById as jest.Mock).mockResolvedValue(mockNews);
  });

  it('carrega i mostra una notícia', async () => {
    const screen = render(<NewsDetailScreen />);

    expect(screen.getByText('Carregant notícia...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Notícia de prova')).toBeTruthy();
    });

    expect(getNewsById).toHaveBeenCalledWith('1');
    expect(screen.getByText('Subtítol de prova')).toBeTruthy();
    expect(screen.getByText('Contingut complet de la notícia')).toBeTruthy();
    expect(screen.getByText('Font: Agent de prova')).toBeTruthy();
  });

  it('mostra la imatge quan la notícia en té', async () => {
    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Imatge de Notícia de prova')).toBeTruthy();
    });
  });

  it('no mostra imatge quan la notícia no en té', async () => {
    (getNewsById as jest.Mock).mockResolvedValueOnce({
      ...mockNews,
      image_url: null,
    });

    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Notícia de prova')).toBeTruthy();
    });

    expect(screen.queryByLabelText('Imatge de Notícia de prova')).toBeNull();
  });

  it('torna al mercat quan es prem el botó', async () => {
    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Notícia de prova')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('‹ Tornar al mercat'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('mostra un error quan falla la càrrega', async () => {
    (getNewsById as jest.Mock).mockRejectedValueOnce(
      new Error('Notícia no trobada'),
    );

    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Notícia no trobada')).toBeTruthy();
    });
  });

  it('mostra el missatge per defecte si lerror no és una instància dError', async () => {
    (getNewsById as jest.Mock).mockRejectedValueOnce('Error desconegut');

    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText('No s’ha pogut carregar la notícia.'),
      ).toBeTruthy();
    });
  });

  it('mostra un error quan no hi ha cap id', async () => {
    mockId = '';

    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('No s’ha indicat cap notícia.')).toBeTruthy();
    });

    expect(getNewsById).not.toHaveBeenCalled();
  });

  it('accepta un id en format array', async () => {
    mockId = ['25', '26'];

    render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(getNewsById).toHaveBeenCalledWith('25');
    });
  });

  it('mostra el missatge per defecte si no hi ha notícia', async () => {
    (getNewsById as jest.Mock).mockResolvedValueOnce(null);

    const screen = render(<NewsDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('No s’ha trobat la notícia.')).toBeTruthy();
    });
  });

  it('ignores a news response after the detail screen unmounts', async () => {
    let resolveNews: ((value: typeof mockNews) => void) | undefined;
    (getNewsById as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => { resolveNews = resolve; }),
    );
    const screen = render(<NewsDetailScreen />);
    screen.unmount();

    await act(async () => resolveNews?.(mockNews));

    expect(getNewsById).toHaveBeenCalledWith('1');
  });
});
