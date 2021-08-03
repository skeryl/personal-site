import { SynthsState } from "./synths";

export interface State {
  synths: SynthsState;
}

export function setImmutably<Key, Value>(
  map: ReadonlyMap<Key, Value>,
  key: Key,
  value: Value,
): Map<Key, Value> {
  const result = new Map(map);
  result.set(key, value);
  return result;
}

export function deleteImmutably<Key, Value>(
  map: ReadonlyMap<Key, Value>,
  key: Key,
): Map<Key, Value> {
  const result = new Map(map);
  result.delete(key);
  return result;
}
