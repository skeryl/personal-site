interface CreatableNumberArray<T extends NumberArray> {
  new (size: number): T;
}

type NumberArray =
  | Float32Array
  | Float64Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Array<number>;

export class ValueSmoother<T extends NumberArray> {
  private readonly totals = new Array(4)
    .fill(undefined)
    .map(() => new this.Type(this.size));

  constructor(
    public readonly size: number,
    private readonly iterations: number,
    private readonly Type: CreatableNumberArray<T>,
  ) {}

  add(values: T): T {
    this.totals.shift();
    this.totals.push(values);
    return this.compute();
  }

  compute(): T {
    const res = new this.Type(this.size);
    for (let i = 0; i < this.size; i++) {
      res[i] =
        this.totals.reduce((total, current) => total + current[i], 0.0) /
        this.totals.length;
    }
    return res;
  }
}
