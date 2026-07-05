class World {
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

  print(target: Drone, drones: Drone[]): void {
    const overlay = this.grid.map(row => [...row]);
    overlay[target.y][target.x] = "X";
    for (const d of drones) {
      overlay[d.y][d.x] = "O";
    }
    const header = "   " + this.grid[0].map((_, i) => String(i).padStart(2, " ")).join(" ");
    console.log(header);
    for (let r = 0; r < overlay.length; r++) {
      const rowStr = String(r).padStart(2, " ") + " " + overlay[r].map(c => c.padStart(2, " ")).join(" ");
      console.log(rowStr);
    }
  }
}


class Drone {
    x:number;
    y: number;

    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
    }
} 


class Swarm {
    drones: Drone[] = []

    constructor(drones: Drone[]){
        this.drones = drones;
    }

    moveDrones() {
        for (let i=0; i < this.drones.length; i++){
            this.drones[i].x +=1;
        }
    }
}



// main


const shahed  = new Drone(5,5);
const d1:Drone = new Drone(1,7);
const d2:Drone = new Drone(4,6);
const d3:Drone = new Drone(2,5);
const d4:Drone = new Drone(8,8);

const swarm = new Swarm([d1,d2,d3,d4])

const map = new World(10, 10);



let iter = 1;
const limit = 5;

while(iter < limit){

    map.print(shahed,swarm.drones)    
    swarm.moveDrones()

    iter++;
}

