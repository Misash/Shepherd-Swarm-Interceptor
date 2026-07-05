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

  print(target: Shahed, swarm: Swarm): void {
    const overlay = this.grid.map(row => [...row]);
    overlay[target.y][target.x] = "X";
    for (const d of swarm.drones) {
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



class Shahed {
    x:number;
    y: number;

    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
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

     private formationReadiness(target: Shahed): number {
        let ready = 0;
        this.drones.forEach((d, i) => {
            const angle = (i * Math.PI) / 2;
            const slotX = target.x + this.formationRadius * Math.cos(angle);
            const slotY = target.y + this.formationRadius * Math.sin(angle);
            const dist = Math.sqrt((d.x - slotX) ** 2 + (d.y - slotY) ** 2);
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

    moveDrones() {
        for (let i=0; i < this.drones.length; i++){
            this.drones[i].x +=1;
        }
    }


}



// main


const shahed   = new Shahed(5,5);
const d1:Drone = new Drone(1,7);
const d2:Drone = new Drone(4,6);
const d3:Drone = new Drone(2,5);
const d4:Drone = new Drone(8,8);

const swarm = new Swarm([d1,d2,d3,d4])

const map = new World(10, 10);



let iter = 1;
const limit = 15;

while(iter < limit){

    console.log(`\n--- t = ${iter} | Phase: ${swarm.phase} ---`);
    map.print(shahed, swarm)
    swarm.step(shahed, iter)
    iter++;
    
}

