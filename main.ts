class World {
  readonly rows: number;
  readonly cols: number;
  private grid: string[][];

  constructor(rows: number, cols: number, defaultValue: string = ".") {
    this.rows = rows;
    this.cols = cols;
    this.grid = Array.from({ length: rows }, () =>
      Array(cols).fill(defaultValue)
    );
  }

  clampX(x: number): number {
    return Math.max(0, Math.min(this.cols - 1, Math.round(x)));
  }

  clampY(y: number): number {
    return Math.max(0, Math.min(this.rows - 1, Math.round(y)));
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

  print(target: Shahed, swarm: Swarm): void {
    const overlay = this.grid.map(row => [...row]);
    overlay[this.clampY(target.y)][this.clampX(target.x)] = "X";
    for (const d of swarm.drones) {
      overlay[this.clampY(d.y)][this.clampX(d.x)] = "O";
    }
    const header = "   " + this.grid[0].map((_, i) => String(i).padStart(2, " ")).join(" ");
    console.log(header);
    for (let r = 0; r < overlay.length; r++) {
      const rowStr = String(r).padStart(2, " ") + " " + overlay[r].map(c => c.padStart(2, " ")).join(" ");
      console.log(rowStr);
    }
  }
}



class Shahed {
    x:number;
    y: number;
    vx: number;
    vy: number;

    constructor(x: number, y: number, vx: number = 1, vy: number = 0){
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
    }

    move(world: World): void {
        this.x += this.vx;
        this.y += this.vy;
        this.x = world.clampX(this.x);
        this.y = world.clampY(this.y);
    }

    heading(): number {
        return Math.atan2(this.vy, this.vx);
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

type Phase = "CHASE" | "FOLLOW" | "FORM" | "ENGAGE";
class Swarm {
    drones: Drone[] = []
    phase: Phase = "CHASE";
    phaseStartTime = 0;

    // parameters
    minChaseTime = 5.0;      // τ_chase
    formationRadius = 40;    // r_formation
    readyTolerance = 15;     // ε_ready
    followThreshold = 80;    
    formThreshold = 45; 


    constructor(drones: Drone[]){
        this.drones = drones;
    }

    //  S(t+1) = f(S(t), Δt, d_avg(t), φ_formation(t))
    private updatePhase(
        currentPhase: Phase, 
        timeInPhase: number, 
        avgDistance: number, 
        formationQuality: number
    ): Phase {
        switch(currentPhase){
            case "CHASE":
                if (timeInPhase >= this.minChaseTime && avgDistance <= this.followThreshold) {
                    return "FOLLOW";
                }
                return currentPhase;
             case "FOLLOW":
                if (avgDistance <= this.formThreshold) {
                    return "FORM";
                }
                return currentPhase;
            case "FORM":
                if (formationQuality >= 3) {
                    return "ENGAGE";
                }
                return currentPhase;
            case "ENGAGE":
                return currentPhase;
        }
    }

    private averageDistance(target: Shahed): number {
        const total = this.drones.reduce((sum, d) => {
            const dx = d.x - target.x;
            const dy = d.y - target.y;
            return sum + Math.sqrt(dx * dx + dy * dy);
        }, 0);
        return total / this.drones.length;
    }

    private formationSlot(target: Shahed, i: number): { x: number, y: number } {
        const heading = target.heading();
        const angle = heading + (i * Math.PI) / 2;
        return {
            x: target.x + this.formationRadius * Math.cos(angle),
            y: target.y + this.formationRadius * Math.sin(angle),
        };
    }

    private formationReadiness(target: Shahed): number {
        let ready = 0;
        this.drones.forEach((d, i) => {
            const slot = this.formationSlot(target, i);
            const dist = Math.sqrt((d.x - slot.x) ** 2 + (d.y - slot.y) ** 2);
            if (dist <= this.readyTolerance) ready++;
        });
        return ready;
    }

    step(target: Shahed, currentTime: number) {
        const avgDist = this.averageDistance(target);
        const formQuality = this.formationReadiness(target);
        const timeInPhase = currentTime - this.phaseStartTime;

        const newPhase = this.updatePhase(this.phase, timeInPhase, avgDist, formQuality);
        if (newPhase !== this.phase) {
            this.phase = newPhase;
            this.phaseStartTime = currentTime;
        }
    }

    moveDrones(target: Shahed, world: World) {
        const speed = 1;
        for (let i = 0; i < this.drones.length; i++) {
            const d = this.drones[i];
            const slot = this.formationSlot(target, i);
            const dx = slot.x - d.x;
            const dy = slot.y - d.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                d.x += (dx / dist) * speed;
                d.y += (dy / dist) * speed;
            }
            d.x = world.clampX(d.x);
            d.y = world.clampY(d.y);
        }
    }


}



// main


const shahed   = new Shahed(2, 2, 1, 0.5);
const d1:Drone = new Drone(1,7);
const d2:Drone = new Drone(4,6);
const d3:Drone = new Drone(2,5);
const d4:Drone = new Drone(8,8);

const swarm = new Swarm([d1,d2,d3,d4])

const map = new World(20, 20);

let iter = 1;
const limit = 30;

while(iter < limit){
    console.log(`\n--- t = ${iter} | Phase: ${swarm.phase} ---`);
    map.print(shahed, swarm)
    shahed.move(map);
    swarm.moveDrones(shahed, map);
    swarm.step(shahed, iter)
    iter++;
}

