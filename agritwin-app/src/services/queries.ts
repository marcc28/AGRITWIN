import { queryOptions } from '@tanstack/react-query';

import { queryClient } from './queryClient';

import {
  getDashboard,
  getField,
  getFieldWeather,
  getFields,
  getGardenTasks,
  getMe,
} from './api';
import { getCrops } from './api_crops';
import { getFieldCrops } from './api_fieldCrops';
import {
  type MarketProduct,
  getMarketProduct,
  getMarketProductsCount,
  getcontentfeed,
} from './api_market';
import { getFieldRecommendations } from './api_recommendations';
import { getAuth } from './auth';
import { queryKeys } from './queryKeys';

export { queryKeys };

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * Data that must always be current (sensors, device status, weather alerts,
 * stock) is considered old after a few seconds: every screen that opens it
 * shows the cached copy and asks the server again. The few seconds only
 * avoid asking twice when a prefetch and the screen run back to back.
 */
const ALWAYS_REVALIDATE = 5 * SECOND;

export const NOT_AUTHENTICATED = 'Not authenticated';

async function requireToken(): Promise<string> {
  const auth = await getAuth();
  if (!auth?.token) {
    throw new Error(NOT_AUTHENTICATED);
  }
  return auth.token;
}

// --------------------------------------------------
// USER
// --------------------------------------------------

export const meQuery = () =>
  queryOptions({
    queryKey: queryKeys.me,
    queryFn: getMe,
    staleTime: 5 * MINUTE,
  });

// --------------------------------------------------
// FIELDS
// --------------------------------------------------

export const fieldsQuery = () =>
  queryOptions({
    queryKey: queryKeys.fields,
    queryFn: getFields,
    staleTime: 30 * SECOND,
  });

/** Field with its devices. Device status changes often: always revalidated. */
export const fieldDetailQuery = (fieldId: number) =>
  queryOptions({
    queryKey: queryKeys.fieldDetail(fieldId),
    queryFn: () => getField(fieldId),
    staleTime: ALWAYS_REVALIDATE,
  });

export const fieldCropsQuery = (fieldId: number) =>
  queryOptions({
    queryKey: queryKeys.fieldCrops(fieldId),
    queryFn: async () =>
      getFieldCrops(0, 100, await requireToken(), { field_id: fieldId }),
    staleTime: 30 * SECOND,
  });

/**
 * How often the sensor screen asks again while the user keeps it open.
 * Ten seconds for the presentation. Change this value to slow it down.
 */
export const SENSOR_REFRESH_MS = 10 * SECOND;

/** Sensor readings: always revalidated so values on screen are current. */
export const dashboardQuery = (fieldId: number) =>
  queryOptions({
    queryKey: queryKeys.dashboard(fieldId),
    queryFn: () => getDashboard(fieldId),
    staleTime: ALWAYS_REVALIDATE,
  });

/**
 * Forecast and weather alerts. Shown from cache instantly, but always asked
 * again to the server so an alert (hail, storm) is never out of date.
 */
export const WEATHER_REFRESH_MS = 10 * MINUTE;

export const weatherQuery = (fieldId: number, lang: string) =>
  queryOptions({
    queryKey: queryKeys.weather(fieldId, lang),
    queryFn: () => getFieldWeather(fieldId, lang),
    staleTime: ALWAYS_REVALIDATE,
    refetchInterval: WEATHER_REFRESH_MS,
  });

/** Tasks and suggestions of the calendar (see hooks/use-garden-tasks). */
export const gardenTasksQuery = (fieldId: number, lang: string) =>
  queryOptions({
    queryKey: queryKeys.tasks(fieldId, lang),
    queryFn: () => getGardenTasks(fieldId, lang),
    staleTime: 30 * SECOND,
  });

export const recommendationsQuery = (fieldId: number | string) =>
  queryOptions({
    queryKey: queryKeys.recommendations(fieldId),
    queryFn: async () => getFieldRecommendations(fieldId, await requireToken()),
    staleTime: 5 * MINUTE,
  });

/** Catalogue of crop types: it barely changes. */
export const cropCatalogQuery = () =>
  queryOptions({
    queryKey: queryKeys.cropCatalog,
    queryFn: async () => getCrops(0, 100, await requireToken()),
    staleTime: 60 * MINUTE,
  });

// --------------------------------------------------
// MARKET
// --------------------------------------------------

const configuredPageSize = Number(process.env.EXPO_PUBLIC_MARKET_PAGE_SIZE);
/** Products per market page (EXPO_PUBLIC_MARKET_PAGE_SIZE, default 5). */
export const MARKET_PAGE_SIZE =
  Number.isInteger(configuredPageSize) && configuredPageSize > 0
    ? configuredPageSize
    : 5;

/** Number of products on sale (for the infinite scroll). */
export const marketCountQuery = () =>
  queryOptions({
    queryKey: queryKeys.marketCount,
    queryFn: getMarketProductsCount,
    staleTime: 5 * MINUTE,
  });

export const marketPageQuery = (offset: number, limit: number) =>
  queryOptions({
    queryKey: queryKeys.marketPage(offset, limit),
    queryFn: () => getcontentfeed(offset, limit),
    staleTime: 5 * MINUTE,
  });

/** Product detail: price and stock are always revalidated before buying. */
export const marketProductQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.marketProduct(id),
    queryFn: () => getMarketProduct(id),
    staleTime: ALWAYS_REVALIDATE,
  });

/** A product already downloaded with a market page, if any. */
export function findProductInMarketPages(
  id: string,
): MarketProduct | undefined {
  const pages = queryClient.getQueriesData<MarketProduct[]>({
    queryKey: [...queryKeys.market, 'page'],
  });
  for (const [, items] of pages) {
    const found = Array.isArray(items)
      ? items.find((item) => String(item.id) === id)
      : undefined;
    if (found) {
      return found;
    }
  }
  return undefined;
}

// --------------------------------------------------
// PREFETCH
// --------------------------------------------------

type AnyQuery = Parameters<typeof queryClient.query>[0];

function fieldQueries(fieldId: number, lang: string) {
  return [
    fieldDetailQuery(fieldId),
    weatherQuery(fieldId, lang),
    fieldCropsQuery(fieldId),
    dashboardQuery(fieldId),
    gardenTasksQuery(fieldId, lang),
  ] as AnyQuery[];
}

function appQueries() {
  return [
    meQuery(),
    cropCatalogQuery(),
    marketCountQuery(),
    marketPageQuery(0, MARKET_PAGE_SIZE),
  ] as AnyQuery[];
}

function prefetch(options: AnyQuery) {
  // Errors are ignored here: the screen shows them when it is opened.
  return queryClient.query(options).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Loads in the background what the main screens of a garden show, so they
 * are ready before the user opens them. Data still fresh is not asked again.
 */
export function prefetchFieldData(fieldId: number, lang: string) {
  fieldQueries(fieldId, lang).forEach((options) => void prefetch(options));
}

/** Data of the app that does not depend on the garden. */
export function prefetchAppData() {
  appQueries().forEach((options) => void prefetch(options));
}

/** Longest wait on the start-up loading screen (a sleeping server). */
export const STARTUP_PRELOAD_TIMEOUT_MS = 12 * SECOND;

/**
 * Start-up: loads all the data of the app (and of the garden, if one is
 * selected) behind the single loading screen, so afterwards every page
 * opens instantly. It never waits longer than the timeout: whatever is
 * still missing then keeps loading on its page.
 */
export async function preloadAppData(
  fieldId: number | null,
  lang: string,
  timeoutMs = STARTUP_PRELOAD_TIMEOUT_MS,
): Promise<void> {
  const requests = [
    ...appQueries(),
    ...(fieldId === null ? [] : fieldQueries(fieldId, lang)),
  ].map(prefetch);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  await Promise.race([Promise.all(requests).then(() => undefined), timeout]);
  clearTimeout(timer);
}
