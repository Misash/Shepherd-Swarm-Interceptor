class Map2D {
  private grid: string[][];

  constructor(rows: number, cols: number, defaultValue: string = ".") {
    this.grid = Array.from({ length: rows }, () =>
      Array(cols).fill(defaultValue)
    );
  }

  setCell(row: number, col: number, value: string): void {
    if (
      row >= 0 &&
      row < this.grid.length &&
      col >= 0 &&
      col < this.grid[0].length
    ) {
      this.grid[row][col] = value;
    }
  }

  getCell(row: number, col: number): string {
    return this.grid[row][col];
  }

  print(): void {
    const header = "   " + this.grid[0].map((_, i) => String(i).padStart(2, " ")).join(" ");
    console.log(header);
    for (let r = 0; r < this.grid.length; r++) {
      const rowStr = String(r).padStart(2, " ") + " " + this.grid[r].map(c => c.padStart(2, " ")).join(" ");
      console.log(rowStr);
    }
  }
}


const map = new Map2D(10, 10);

map.setCell(0, 0, "S"); // Start
map.setCell(4, 7, "G"); // Goal

map.print();