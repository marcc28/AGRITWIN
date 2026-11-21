import { useEffect, useState } from 'react';

import {
  getCurrentField,
  peekCurrentField,
  subscribeCurrentField,
  type CurrentField,
} from '@/services/currentField';

function sameField(
  a: CurrentField | null | undefined,
  b: CurrentField | null | undefined,
) {
  return a === b || (!!a && !!b && a.id === b.id && a.name === b.name);
}

export function useCurrentField() {
  // Known at once when another screen has already read it.
  const [field, setField] = useState<CurrentField | null | undefined>(
    peekCurrentField,
  );

  useEffect(() => {
    let active = true;

    const load = () => {
      void getCurrentField()
        .catch(() => null)
        .then((value) => {
          if (active) {
            setField((previous) =>
              sameField(previous, value) ? previous : value,
            );
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
