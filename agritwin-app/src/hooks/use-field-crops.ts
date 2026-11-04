import { useEffect, useState, useCallback } from 'react';

import {
  getFieldCrops,
  type FieldCrop,
} from '@/services/api_fieldCrops';

import { getAuth } from '@/services/auth';

type State = {
  status: 'loading' | 'success' | 'error';
  data: FieldCrop[];
  error?: string;
};

export function useFieldCrops(fieldId: number | null) {
  const [state, setState] = useState<State>({
    status: 'loading',
    data: [],
  });

  const fetchCrops = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'loading',
    }));

    try {
      const auth = await getAuth();
      const token = auth?.token;

      if (!fieldId || !token) {
        setState({
          status: 'success',
          data: [],
        });
        return;
      }

      const crops = await getFieldCrops(
        0,
        100,
        token,
        {
          field_id: fieldId,
        },
      );

      setState({
        status: 'success',
        data: crops,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Error carregant els cultius',
      }));
    }
  }, [fieldId]);

  useEffect(() => {
    void fetchCrops();
  }, [fetchCrops]);

  return {
    ...state,
    retry: fetchCrops,
  };
}