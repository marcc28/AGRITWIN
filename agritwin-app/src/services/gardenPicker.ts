import type { Field } from './api';

export type GardenPickerState = {
  open: boolean;
  fields: Field[];
  currentId: number | null;
};

type Listener = () => void;

let state: GardenPickerState = {
  open: false,
  fields: [],
  currentId: null,
};

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getGardenPicker(): GardenPickerState {
  return state;
}

export function setGardenPicker(next: Partial<GardenPickerState>): void {
  state = { ...state, ...next };
  notify();
}

export function subscribeGardenPicker(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
