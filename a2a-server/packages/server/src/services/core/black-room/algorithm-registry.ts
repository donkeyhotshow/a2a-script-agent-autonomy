export class AlgorithmRegistry {
  register(_id: string, _fn: unknown): void {}
  get(_id: string): unknown {
    return null;
  }
  async loadFromDirectory(): Promise<void> {}
  count(): number {
    return 0;
  }
}
export const algorithmRegistry = new AlgorithmRegistry();
