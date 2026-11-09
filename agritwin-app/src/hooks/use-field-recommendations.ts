import { useCallback, useEffect, useState } from 'react';

import {
  getFieldRecommendations,
  type Recommendation,
} from '@/services/api_recommendations';

import { getAuth } from '@/services/auth';

type RecommendationsState = {
  status: 'loading' | 'success' | 'error';
  data: Recommendation[];
};

export function useFieldRecommendations(fieldId: string | number | null) {
  const [state, setState] = useState<RecommendationsState>({
    status: 'loading',
    data: [],
  });

  const fetchRecommendations = useCallback(async () => {
    if (fieldId == null) {
      setState({
        status: 'success',
        data: [],
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'loading',
    }));

    try {
      const auth = await getAuth();

      if (!auth?.token) {
        throw new Error('Authentication required');
      }

      const recommendations = await getFieldRecommendations(
        fieldId,
        auth.token,
      );

      setState({
        status: 'success',
        data: recommendations,
      });
    } catch {
      setState((previous) => ({
        ...previous,
        status: 'error',
      }));
    }
  }, [fieldId]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    ...state,
    retry: fetchRecommendations,
  };
}
