/** Route params arrive as strings: '7' and 7 must share the same cache. */
function toFieldKey(fieldId: number | string): number | string {
  const numeric = Number(fieldId);
  return Number.isFinite(numeric) ? numeric : fieldId;
}

/**
 * Cache keys. Everything that belongs to one field starts with
 * ['field', id] so it can be refreshed in one go after a change.
 */
export const queryKeys = {
  me: ['me'] as const,
  fields: ['fields'] as const,
  field: (fieldId: number) => ['field', fieldId] as const,
  fieldDetail: (fieldId: number) => ['field', fieldId, 'detail'] as const,
  fieldCrops: (fieldId: number) => ['field', fieldId, 'crops'] as const,
  dashboard: (fieldId: number) => ['field', fieldId, 'dashboard'] as const,
  weather: (fieldId: number, lang: string) =>
    ['field', fieldId, 'weather', lang] as const,
  tasks: (fieldId: number, lang: string) =>
    ['field', fieldId, 'tasks', lang] as const,
  recommendations: (fieldId: number | string) =>
    ['field', toFieldKey(fieldId), 'recommendations'] as const,
  cropCatalog: ['crops', 'catalog'] as const,
  cropCatalogPage: (offset: number, limit: number) =>
    ['crops', 'catalog', 'page', offset, limit] as const,
  market: ['market'] as const,
  marketCount: ['market', 'count'] as const,
  marketPage: (offset: number, limit: number) =>
    ['market', 'page', offset, limit] as const,
  marketProduct: (id: string) => ['market', 'product', id] as const,
};
