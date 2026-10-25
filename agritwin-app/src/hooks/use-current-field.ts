import { useEffect, useState } from 'react';

import {
  getCurrentField,
  subscribeCurrentField,
  type CurrentField,
} from '@/services/currentField';

export function useCurrentField() {
  const [field, setField] = useState<CurrentField | null | undefined>();

  useEffect(() => {
    let active = true;

    const load = () => {
      void getCurrentField()
        .catch(() => null)
        .then((value) => {
          if (active) {
            setField(value);
          }
        });
    };

    load();
    const unsubscribe = subscribeCurrentField(load);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return field;
}
