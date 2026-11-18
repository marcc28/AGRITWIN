import { queryClient } from '@/services/queryClient';
import { queryKeys } from '@/services/queryKeys';
import {
  forgetField,
  invalidateCropCatalog,
  invalidateField,
  invalidateFieldCrops,
} from '@/services/cacheInvalidation';
import {
  MARKET_PAGE_SIZE,
  NOT_AUTHENTICATED,
  cropCatalogQuery,
  fieldCropsQuery,
  findProductInMarketPages,
  marketCountQuery,
  prefetchAppData,
  prefetchFieldData,
  preloadAppData,
  recommendationsQuery,
} from '@/services/queries';
import {
  CACHE_BUSTER,
  clearQueryCache,
  persistOptions,
  queryPersister,
  shouldPersistQuery,
} from '@/services/queryPersistence';
import { getDashboard, getField, getFieldWeather, getMe } from '@/services/api';
import { getCrops } from '@/services/api_crops';
import { getFieldCrops } from '@/services/api_fieldCrops';
import { getMarketProductsCount, getcontentfeed } from '@/services/api_market';
import { getFieldRecommendations } from '@/services/api_recommendations';
import { getAuth } from '@/services/auth';

jest.mock('@/services/api', () => ({
  getDashboard: jest.fn(),
  getField: jest.fn(),
  getFieldWeather: jest.fn(),
  getFields: jest.fn(),
  getMe: jest.fn(),
}));

jest.mock('@/services/api_crops', () => ({ getCrops: jest.fn() }));
jest.mock('@/services/api_fieldCrops', () => ({ getFieldCrops: jest.fn() }));
jest.mock('@/services/api_recommendations', () => ({
  getFieldRecommendations: jest.fn(),
}));
jest.mock('@/services/api_market', () => ({
  getMarketProduct: jest.fn(),
  getMarketProductsCount: jest.fn(),
  getcontentfeed: jest.fn(),
}));
jest.mock('@/services/auth', () => ({ getAuth: jest.fn() }));

const mockedGetAuth = getAuth as jest.Mock;

function isInvalidated(queryKey: readonly unknown[]) {
  return queryClient.getQueryState(queryKey)?.isInvalidated ?? false;
}

describe('query cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockResolvedValue({ token: 'token-1', username: 'anna' });
  });

  describe('keys', () => {
    it('uses the same key for a numeric id and its route string', () => {
      expect(queryKeys.recommendations('7')).toEqual(
        queryKeys.recommendations(7),
      );
      expect(queryKeys.recommendations('abc')).toEqual([
        'field',
        'abc',
        'recommendations',
      ]);
    });

    it('groups every garden query under the garden', () => {
      expect(queryKeys.weather(3, 'ca').slice(0, 2)).toEqual(
        queryKeys.field(3),
      );
      expect(queryKeys.dashboard(3).slice(0, 2)).toEqual(queryKeys.field(3));
    });
  });

  describe('queries', () => {
    it('asks the crops of a garden with the session token', async () => {
      (getFieldCrops as jest.Mock).mockResolvedValue([]);

      await queryClient.query(fieldCropsQuery(4));

      expect(getFieldCrops).toHaveBeenCalledWith(0, 100, 'token-1', {
        field_id: 4,
      });
    });

    it('fails without a session instead of calling the server', async () => {
      mockedGetAuth.mockResolvedValue(null);

      await expect(queryClient.query(cropCatalogQuery())).rejects.toThrow(
        NOT_AUTHENTICATED,
      );
      expect(getCrops).not.toHaveBeenCalled();
    });

    it('loads recommendations and market totals', async () => {
      (getFieldRecommendations as jest.Mock).mockResolvedValue(['r']);
      (getMarketProductsCount as jest.Mock).mockResolvedValue(12);

      await expect(
        queryClient.query(recommendationsQuery('5')),
      ).resolves.toEqual(['r']);
      await expect(queryClient.query(marketCountQuery())).resolves.toBe(12);
      expect(getFieldRecommendations).toHaveBeenCalledWith('5', 'token-1');
    });

    it('finds a product already loaded with a market page', () => {
      queryClient.setQueryData(queryKeys.marketPage(0, 5), [
        { id: 1, product: 'Pomes' },
        { id: 2, product: 'Peres' },
      ]);

      expect(findProductInMarketPages('2')).toEqual({
        id: 2,
        product: 'Peres',
      });
      expect(findProductInMarketPages('9')).toBeUndefined();
    });
  });

  describe('prefetch', () => {
    it('loads the main data of a garden in the background', async () => {
      (getField as jest.Mock).mockResolvedValue({ id: 3, devices: [] });
      (getFieldWeather as jest.Mock).mockResolvedValue({ daily: [] });
      (getFieldCrops as jest.Mock).mockResolvedValue([]);
      (getDashboard as jest.Mock).mockRejectedValue(new Error('offline'));

      prefetchFieldData(3, 'es');

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getField).toHaveBeenCalledWith(3);
      expect(getFieldWeather).toHaveBeenCalledWith(3, 'es');
      expect(getDashboard).toHaveBeenCalledWith(3);
      expect(queryClient.getQueryData(queryKeys.fieldDetail(3))).toEqual({
        id: 3,
        devices: [],
      });
    });

    it('does not ask again for data that is still fresh', async () => {
      queryClient.setQueryData(queryKeys.me, { username: 'anna' });
      (getCrops as jest.Mock).mockResolvedValue([]);
      (getMarketProductsCount as jest.Mock).mockResolvedValue(1);
      (getcontentfeed as jest.Mock).mockResolvedValue([]);

      prefetchAppData();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getMe).not.toHaveBeenCalled();
      expect(getcontentfeed).toHaveBeenCalledWith(0, MARKET_PAGE_SIZE);
    });
  });

  describe('start-up preload', () => {
    function answerEverything() {
      (getMe as jest.Mock).mockResolvedValue({ username: 'anna' });
      (getCrops as jest.Mock).mockResolvedValue([]);
      (getMarketProductsCount as jest.Mock).mockResolvedValue(1);
      (getcontentfeed as jest.Mock).mockResolvedValue([]);
    }

    it('waits until the app and garden data are loaded', async () => {
      answerEverything();
      (getField as jest.Mock).mockResolvedValue({ id: 3, devices: [] });
      (getFieldWeather as jest.Mock).mockResolvedValue({ daily: [] });
      (getFieldCrops as jest.Mock).mockResolvedValue([]);
      (getDashboard as jest.Mock).mockRejectedValue(new Error('offline'));

      await preloadAppData(3, 'it');

      expect(queryClient.getQueryData(queryKeys.me)).toEqual({
        username: 'anna',
      });
      expect(queryClient.getQueryData(queryKeys.weather(3, 'it'))).toEqual({
        daily: [],
      });
    });

    it('loads only the app data when no garden is selected', async () => {
      answerEverything();

      await preloadAppData(null, 'it');

      expect(getField).not.toHaveBeenCalled();
      expect(getMe).toHaveBeenCalled();
    });

    it('stops waiting for a server that does not answer', async () => {
      answerEverything();
      (getMe as jest.Mock).mockReturnValue(new Promise(() => undefined));

      await expect(preloadAppData(null, 'it', 20)).resolves.toBeUndefined();
    });
  });

  describe('invalidation after a change', () => {
    beforeEach(() => {
      queryClient.setQueryData(queryKeys.fields, []);
      queryClient.setQueryData(queryKeys.fieldDetail(1), {});
      queryClient.setQueryData(queryKeys.fieldDetail(2), {});
      queryClient.setQueryData(queryKeys.fieldCrops(1), []);
      queryClient.setQueryData(queryKeys.fieldCrops(2), []);
      queryClient.setQueryData(queryKeys.recommendations(1), []);
      queryClient.setQueryData(queryKeys.cropCatalog, []);
    });

    it('marks one garden and the garden list as old', () => {
      invalidateField(1);

      expect(isInvalidated(queryKeys.fields)).toBe(true);
      expect(isInvalidated(queryKeys.fieldDetail(1))).toBe(true);
      expect(isInvalidated(queryKeys.fieldDetail(2))).toBe(false);
    });

    it('marks every garden as old when none is given', () => {
      invalidateField();

      expect(isInvalidated(queryKeys.fieldDetail(2))).toBe(true);
    });

    it('marks crops and recommendations of a garden as old', () => {
      invalidateFieldCrops(1);

      expect(isInvalidated(queryKeys.fieldCrops(1))).toBe(true);
      expect(isInvalidated(queryKeys.recommendations(1))).toBe(true);
      expect(isInvalidated(queryKeys.fieldCrops(2))).toBe(false);
      expect(isInvalidated(queryKeys.fieldDetail(1))).toBe(false);
    });

    it('marks the crops of every garden as old when none is given', () => {
      invalidateFieldCrops();

      expect(isInvalidated(queryKeys.fieldCrops(2))).toBe(true);
    });

    it('drops the data of a deleted garden', () => {
      forgetField(1);

      expect(
        queryClient.getQueryData(queryKeys.fieldDetail(1)),
      ).toBeUndefined();
      expect(queryClient.getQueryData(queryKeys.fieldCrops(1))).toBeUndefined();
      expect(queryClient.getQueryData(queryKeys.fieldDetail(2))).toEqual({});
      expect(isInvalidated(queryKeys.fields)).toBe(true);
    });

    it('marks the crop catalogue as old', () => {
      invalidateCropCatalog();

      expect(isInvalidated(queryKeys.cropCatalog)).toBe(true);
    });
  });

  describe('persistence on the phone', () => {
    it('saves successful answers only', async () => {
      queryClient.setQueryData(queryKeys.me, { username: 'anna' });
      const saved = queryClient
        .getQueryCache()
        .find({ queryKey: queryKeys.me });

      await queryClient
        .query({
          queryKey: ['broken'],
          queryFn: () => Promise.reject(new Error('x')),
        })
        .catch(() => undefined);
      const failed = queryClient.getQueryCache().find({ queryKey: ['broken'] });

      expect(shouldPersistQuery(saved!)).toBe(true);
      expect(shouldPersistQuery(failed!)).toBe(false);
    });

    it('does not save queries that opt out', async () => {
      await queryClient.query({
        queryKey: ['search'],
        queryFn: () => Promise.resolve([]),
        meta: { persist: false },
      });
      const query = queryClient.getQueryCache().find({ queryKey: ['search'] })!;

      expect(shouldPersistQuery(query)).toBe(false);
    });

    it('drops copies saved by an older version of the app', () => {
      expect(persistOptions.buster).toBe(CACHE_BUSTER);
      expect(persistOptions.maxAge).toBeGreaterThan(0);
    });

    it('forgets everything on logout', async () => {
      const removeClient = jest
        .spyOn(queryPersister, 'removeClient')
        .mockResolvedValue(undefined);
      queryClient.setQueryData(queryKeys.me, { username: 'anna' });

      await clearQueryCache();

      expect(queryClient.getQueryData(queryKeys.me)).toBeUndefined();
      expect(removeClient).toHaveBeenCalled();
      removeClient.mockRestore();
    });

    it('still empties the memory when the phone storage fails', async () => {
      const removeClient = jest
        .spyOn(queryPersister, 'removeClient')
        .mockRejectedValue(new Error('disk'));
      queryClient.setQueryData(queryKeys.me, { username: 'anna' });

      await expect(clearQueryCache()).resolves.toBeUndefined();

      expect(queryClient.getQueryData(queryKeys.me)).toBeUndefined();
      removeClient.mockRestore();
    });
  });
});
