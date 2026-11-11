import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getField, type FieldDevice } from '@/services/api';

export type FieldDevicesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; devices: FieldDevice[] };

/**
 * Devices of a field with their status. It loads again every time the screen
 * comes back into focus, so a board added or removed elsewhere shows up.
 */
export function useFieldDevices(fieldId: number | null) {
  const [state, setState] = useState<FieldDevicesState>({ status: 'loading' });
  const loadedFor = useRef<number | null>(null);

  const load = useCallback(
    (isActive: () => boolean) => {
      if (fieldId == null) {
        return;
      }
      if (loadedFor.current !== fieldId) {
        setState({ status: 'loading' });
      }
      getField(fieldId)
        .then((field) => {
          if (isActive()) {
            loadedFor.current = fieldId;
            setState({ status: 'ready', devices: field.devices });
          }
        })
        .catch(() => {
          // Keep what is already on screen if only a refresh fails.
          if (isActive() && loadedFor.current !== fieldId) {
            setState({ status: 'error' });
          }
        });
    },
    [fieldId],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    loadedFor.current = null;
    load(() => true);
  }, [load]);

  return { state, retry };
}
