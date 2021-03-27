type Callback<T, V> = (key: T, value: V) => void;
const noop = () => undefined;

export class TimeSensitiveMap<K, V> implements Map<K, V> {
  private readonly delegate: Map<K, V>;
  private readonly scheduledDeletions = new Map<K, number>();

  constructor(private readonly onDelete: Callback<K, V> = noop) {
    this.delegate = new Map();
  }

  get(key: K): V | undefined {
    return this.delegate.get(key);
  }

  readonly [Symbol.toStringTag]: string = "TimeSensitiveSet";

  get size(): number {
    return this.delegate.size;
  }

  [Symbol.iterator]() {
    return this.delegate[Symbol.iterator]();
  }

  set(key: K, value: V, timeToLive = 1000): this {
    this.delegate.set(key, value);
    const deletion = setTimeout(() => {
      this.delete(key);
    }, timeToLive);
    this.scheduledDeletions.set(key, deletion);
    return this;
  }

  clear(): void {
    this.scheduledDeletions.forEach((timeout) => {
      window.clearTimeout(timeout);
    });
    this.scheduledDeletions.clear();
    this.delegate.clear();
  }

  delete(key: K): boolean {
    const val = this.delegate.get(key);
    if (val === undefined) {
      return false;
    }
    window.clearTimeout(this.scheduledDeletions.get(key));
    this.scheduledDeletions.delete(key);
    this.delegate.delete(key);
    this.onDelete(key, val);
    return true;
  }

  entries() {
    return this.delegate.entries();
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any,
  ): void {
    this.delegate.forEach(callbackfn, thisArg);
  }

  has(value: K): boolean {
    return this.delegate.has(value);
  }

  keys(): IterableIterator<K> {
    return this.delegate.keys();
  }

  values() {
    return this.delegate.values();
  }
}
