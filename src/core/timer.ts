export class Timer {
  private start: bigint;

  constructor() {
    this.start = process.hrtime.bigint();
  }

  elapsed(): number {
    const diff = process.hrtime.bigint() - this.start;
    return Number(diff / 1_000_000n);
  }
}
