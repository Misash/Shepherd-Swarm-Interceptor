export class World {
  readonly rows: number;
  readonly cols: number;
  readonly height: number;

  constructor(rows: number, cols: number, height: number = 15) {
    this.rows = rows;
    this.cols = cols;
    this.height = height;
  }

  clampX(x: number): number {
    return Math.max(0, Math.min(this.cols - 1, Math.round(x)));
  }

  clampY(y: number): number {
    return Math.max(0, Math.min(this.rows - 1, Math.round(y)));
  }

  clampZ(z: number): number {
    return Math.max(0, Math.min(this.height - 1, z));
  }
}
