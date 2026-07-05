class World {
  readonly rows: number;
  readonly cols: number;
  readonly height: number;
  private grid: string[][];

  constructor(rows: number, cols: number, height: number = 10, defaultValue: string = ".") {
    this.rows = rows;
    this.cols = cols;
    this.height = height;
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

  clampZ(z: number): number {
    return Math.max(0, Math.min(this.height - 1, z));
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
    for (let i = 0; i < swarm.drones.length; i++) {
      const d = swarm.drones[i];
      overlay[this.clampY(d.y)][this.clampX(d.x)] =
        i === swarm.eliminated ? "★" : "O";
    }
    const header = "   " + this.grid[0].map((_, i) => String(i).padStart(2, " ")).join(" ");
    console.log(header);
    for (let r = 0; r < overlay.length; r++) {
      const rowStr = String(r).padStart(2, " ") + " " + overlay[r].map(c => c.padStart(2, " ")).join(" ");
      console.log(rowStr);
    }
    const zLine = "Z  Shahed=" + target.z.toFixed(1) + " | " + swarm.drones.map((d,i) => "D" + i + "=" + d.z.toFixed(1)).join(" ");
    console.log(zLine);
  }
}



class Shahed {
    x:number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;

    constructor(x: number, y: number, z: number = 5, vx: number = 1, vy: number = 0, vz: number = 0){
        this.x = x;
        this.y = y;
        this.z = z;
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
    }

    move(world: World): void {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;
        if (Math.round(this.x) >= world.cols || Math.round(this.x) < 0) {
            this.vx = -this.vx;
            this.x = world.clampX(this.x);
        }
        if (Math.round(this.y) >= world.rows || Math.round(this.y) < 0) {
            this.vy = -this.vy;
            this.y = world.clampY(this.y);
        }
        if (Math.round(this.z) >= world.height || Math.round(this.z) < 0) {
            this.vz = -this.vz;
            this.z = world.clampZ(this.z);
        }
    }

    heading(): number {
        return Math.atan2(this.vy, this.vx);
    }
}

class Drone {
    x:number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number = 0){
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

type Role = "STRIKER" | "SHEPHERD";

type Phase = "ASCEND" | "CHASE" | "FOLLOW" | "FORM" | "ENGAGE";
class Swarm {
    drones: Drone[] = []
    phase: Phase = "ASCEND";
    phaseStartTime = 0;
    activeIndex: number | null = null;
    eliminated: number | null = null;

    // ascend parameters
    ascendSpeed = 0.5;
    zTolerance = 1.0;

    // phase transition parameters
    minChaseTime = 5.0;      // τ_chase
    followThreshold = 10;
    formThreshold = 6;

    // formation parameters
    formationRadius = 5;     // r_formation
    readyTolerance = 2;      // ε_ready
    orbitSpeed = 0.4;        // v_orbit (tangential)

    // pursuit parameters
    strikeThreshold = 4;     // switch predictive ↔ direct
    tauHorizon = 1.0;        // τ_horizon (prediction horizon)
    strikeMultiplier = 1.5;  // k_strike
    interceptRadius = 1.0;   // distance to consider target eliminated


    constructor(drones: Drone[]){
        this.drones = drones;
    }

    //  S(t+1) = f(S(t), Δt, d_avg(t), φ_formation(t))
    private updatePhase(
        currentPhase: Phase,
        timeInPhase: number,
        avgDistance: number,
        formationQuality: number,
        zReady: boolean = false
    ): Phase {
        switch(currentPhase){
            case "ASCEND":
                if (zReady) {
                    return "CHASE";
                }
                return currentPhase;
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

    // eq 3.2: f_i(t) = p_target + r_formation · [cos(θ + i·π/2), sin(θ + i·π/2)]
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

    private allDronesAtZ(target: Shahed): boolean {
        return this.drones.every(d => Math.abs(d.z - target.z) <= this.zTolerance);
    }

    // eq 3.3: a*(t) = argmin ‖p_i - p_target‖
    private selectActiveInterceptor(target: Shahed): number {
        let best = 0;
        let bestDist = Infinity;
        this.drones.forEach((d, i) => {
            const dist = Math.sqrt((d.x - target.x) ** 2 + (d.y - target.y) ** 2);
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        });
        return best;
    }

    // check if target has been intercepted by active interceptor
    intercepted(target: Shahed): boolean {
        if (this.phase !== "ENGAGE" || this.activeIndex === null) return false;
        const d = this.drones[this.activeIndex];
        const dist = Math.sqrt((d.x - target.x) ** 2 + (d.y - target.y) ** 2);
        if (dist <= this.interceptRadius) {
            this.eliminated = this.activeIndex;
            return true;
        }
        return false;
    }

    // eq 3.4: predictive pursuit (d > strikeThreshold)
    private predictivePursuit(target: Shahed, i: number): void {
        const d = this.drones[i];
        const futureX = target.x + target.vx * this.tauHorizon;
        const futureY = target.y + target.vy * this.tauHorizon;
        const dx = futureX - d.x;
        const dy = futureY - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
            d.x += (dx / dist) * this.strikeMultiplier;
            d.y += (dy / dist) * this.strikeMultiplier;
        }
    }

    // direct pursuit (d ≤ strikeThreshold)
    private directPursuit(target: Shahed, i: number): void {
        const d = this.drones[i];
        const dx = target.x - d.x;
        const dy = target.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
            d.x += (dx / dist) * this.strikeMultiplier;
            d.y += (dy / dist) * this.strikeMultiplier;
        }
    }

    // ring orbit dynamics for shepherds: radial + tangential velocity
    private orbitFormation(target: Shahed, i: number): void {
        const d = this.drones[i];
        const slot = this.formationSlot(target, i);
        const dx = slot.x - d.x;
        const dy = slot.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
            // radial component: pull toward slot
            d.x += (dx / dist) * this.orbitSpeed * 0.6;
            d.y += (dy / dist) * this.orbitSpeed * 0.6;
            // tangential component: orbit along ring
            const theta = target.heading() + (i * Math.PI) / 2;
            d.x += -Math.sin(theta) * this.orbitSpeed * 0.4;
            d.y += Math.cos(theta) * this.orbitSpeed * 0.4;
        }
    }

    step(target: Shahed, currentTime: number) {
        const avgDist = this.averageDistance(target);
        const formQuality = this.formationReadiness(target);
        const timeInPhase = currentTime - this.phaseStartTime;
        const zReady = this.allDronesAtZ(target);

        const newPhase = this.updatePhase(this.phase, timeInPhase, avgDist, formQuality, zReady);
        if (newPhase !== this.phase) {
            this.phase = newPhase;
            this.phaseStartTime = currentTime;
        }
        if (this.phase === "ENGAGE") {
            this.activeIndex = this.selectActiveInterceptor(target);
        }
    }

    moveDrones(target: Shahed, world: World) {
        if (this.phase === "ASCEND") {
            for (let i = 0; i < this.drones.length; i++) {
                const d = this.drones[i];
                if (Math.abs(d.z - target.z) > this.zTolerance) {
                    d.z += d.z < target.z ? this.ascendSpeed : -this.ascendSpeed;
                }
                d.z = world.clampZ(d.z);
                const slot = this.formationSlot(target, i);
                const dx = slot.x - d.x;
                const dy = slot.y - d.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) {
                    d.x += (dx / dist) * 1;
                    d.y += (dy / dist) * 1;
                }
                d.x = world.clampX(d.x);
                d.y = world.clampY(d.y);
            }
        } else if (this.phase === "ENGAGE") {
            this.activeIndex = this.selectActiveInterceptor(target);
            for (let i = 0; i < this.drones.length; i++) {
                const d = this.drones[i];
                if (i === this.activeIndex) {
                    const dist = Math.sqrt((d.x - target.x) ** 2 + (d.y - target.y) ** 2);
                    if (dist > this.strikeThreshold) {
                        this.predictivePursuit(target, i);
                    } else {
                        this.directPursuit(target, i);
                    }
                } else {
                    this.orbitFormation(target, i);
                }
                d.x = world.clampX(d.x);
                d.y = world.clampY(d.y);
            }
        } else {
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


}



// main


const shahed   = new Shahed(2, 2, 5, 1, 0.5, 0);
const d1:Drone = new Drone(1,7);
const d2:Drone = new Drone(4,6);
const d3:Drone = new Drone(2,5);
const d4:Drone = new Drone(8,8);

const swarm = new Swarm([d1,d2,d3,d4])

const map = new World(20, 20, 10);

let iter = 1;
let gameOver = false;

while(!gameOver){
    const active = swarm.phase === "ENGAGE" ? ` | Active: ${swarm.activeIndex}` : "";
    console.log(`\n--- t = ${iter} | Phase: ${swarm.phase}${active} ---`);
    map.print(shahed, swarm)
    shahed.move(map);
    swarm.moveDrones(shahed, map);
    swarm.step(shahed, iter)
    gameOver = swarm.intercepted(shahed);
    if (gameOver) {
        console.log(`\n--- t = ${iter} | FINAL STRIKE ---`);
        map.print(shahed, swarm)
    }
    if (!gameOver) iter++;
}

console.log(`\n*** TARGET INTERCEPTED by Drone ${swarm.eliminated} at t = ${iter} ***`);

