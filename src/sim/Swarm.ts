import { Phase } from "./types";
import { Shahed } from "./Shahed";
import { Drone } from "./Drone";
import { World } from "./World";

export class Swarm {
  drones: Drone[] = [];
  phase: Phase = "ASCEND";
  phaseStartTime = 0;
  activeIndex: number | null = null;
  eliminated: number | null = null;

  ascendSpeed = 0.5;
  zTolerance = 1.0;

  minChaseTime = 5.0;
  followThreshold = 10;
  formThreshold = 6;

  formationRadius = 5;
  readyTolerance = 3;
  orbitSpeed = 1.2;

  strikeThreshold = 4;
  tauHorizon = 1.0;
  strikeMultiplier = 2.5;
  interceptRadius = 1.0;

  constructor(drones: Drone[]) {
    this.drones = drones;
  }

  private updatePhase(
    currentPhase: Phase,
    timeInPhase: number,
    avgDistance: number,
    formationQuality: number,
    zReady: boolean = false
  ): Phase {
    switch (currentPhase) {
      case "ASCEND":
        if (zReady) return "CHASE";
        return currentPhase;
      case "CHASE":
        if (timeInPhase >= this.minChaseTime && avgDistance <= this.followThreshold) return "FOLLOW";
        return currentPhase;
      case "FOLLOW":
        if (avgDistance <= this.formThreshold) return "FORM";
        return currentPhase;
      case "FORM":
        if (formationQuality >= 3) return "ENGAGE";
        return currentPhase;
      case "ENGAGE":
        return currentPhase;
    }
  }

  averageDistance(target: Shahed): number {
    const total = this.drones.reduce((sum, d) => {
      const dx = d.x - target.x;
      const dy = d.y - target.y;
      const dz = d.z - target.z;
      return sum + Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, 0);
    return this.drones.length > 0 ? total / this.drones.length : 0;
  }

  private formationSlot(target: Shahed, i: number): { x: number; y: number; z: number } {
    const heading = target.heading();
    const phi = (i * Math.PI) / 2;
    const perpX = -Math.sin(heading);
    const perpY = Math.cos(heading);
    return {
      x: target.x + this.formationRadius * Math.cos(phi) * perpX,
      y: target.y + this.formationRadius * Math.cos(phi) * perpY,
      z: target.z + this.formationRadius * Math.sin(phi),
    };
  }

  formationReadiness(target: Shahed): number {
    let ready = 0;
    this.drones.forEach((d, i) => {
      const slot = this.formationSlot(target, i);
      const dist = Math.sqrt((d.x - slot.x) ** 2 + (d.y - slot.y) ** 2 + (d.z - slot.z) ** 2);
      if (dist <= this.readyTolerance) ready++;
    });
    return ready;
  }

  private allDronesAtZ(target: Shahed): boolean {
    return this.drones.every((d) => Math.abs(d.z - target.z) <= this.zTolerance);
  }

  private selectActiveInterceptor(target: Shahed): number {
    let best = 0;
    let bestDist = Infinity;
    this.drones.forEach((d, i) => {
      const dist = Math.sqrt((d.x - target.x) ** 2 + (d.y - target.y) ** 2 + (d.z - target.z) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  intercepted(target: Shahed): boolean {
    if (this.phase !== "ENGAGE" || this.activeIndex === null) return false;
    const d = this.drones[this.activeIndex];
    const dist = Math.sqrt((d.x - target.x) ** 2 + (d.y - target.y) ** 2 + (d.z - target.z) ** 2);
    if (dist <= this.interceptRadius) {
      this.eliminated = this.activeIndex;
      return true;
    }
    return false;
  }

  private predictivePursuit(target: Shahed, i: number): void {
    const d = this.drones[i];
    const futureX = target.x + target.vx * this.tauHorizon;
    const futureY = target.y + target.vy * this.tauHorizon;
    const futureZ = target.z + target.vz * this.tauHorizon;
    const dx = futureX - d.x;
    const dy = futureY - d.y;
    const dz = futureZ - d.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 0.5) {
      d.x += (dx / dist) * this.strikeMultiplier;
      d.y += (dy / dist) * this.strikeMultiplier;
      d.z += (dz / dist) * this.strikeMultiplier;
    }
  }

  private directPursuit(target: Shahed, i: number): void {
    const d = this.drones[i];
    const dx = target.x - d.x;
    const dy = target.y - d.y;
    const dz = target.z - d.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 0.5) {
      d.x += (dx / dist) * this.strikeMultiplier;
      d.y += (dy / dist) * this.strikeMultiplier;
      d.z += (dz / dist) * this.strikeMultiplier;
    }
  }

  private orbitFormation(target: Shahed, i: number): void {
    const d = this.drones[i];
    d.x += target.vx;
    d.y += target.vy;
    d.z += target.vz;
    const slot = this.formationSlot(target, i);
    const dx = slot.x - d.x;
    const dy = slot.y - d.y;
    const dz = slot.z - d.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 0.5) {
      d.x += (dx / dist) * this.orbitSpeed * 0.6;
      d.y += (dy / dist) * this.orbitSpeed * 0.6;
      d.z += (dz / dist) * this.orbitSpeed * 0.6;
      const theta = target.heading() + (i * Math.PI) / 2;
      d.x += -Math.sin(theta) * this.orbitSpeed * 0.4;
      d.y += Math.cos(theta) * this.orbitSpeed * 0.4;
    }
  }

  step(target: Shahed, currentTime: number): void {
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

  moveDrones(target: Shahed, world: World): void {
    if (this.phase === "ASCEND") {
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        d.saveTrail();
        if (Math.abs(d.z - target.z) > this.zTolerance) {
          d.z += d.z < target.z ? this.ascendSpeed : -this.ascendSpeed;
        }
        d.z = world.clampZ(d.z);
        const slot = this.formationSlot(target, i);
        const dx = slot.x - d.x;
        const dy = slot.y - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          d.x += (dx / dist) * 1.5;
          d.y += (dy / dist) * 1.5;
        }
        d.x = world.clampX(d.x);
        d.y = world.clampY(d.y);
      }
    } else if (this.phase === "ENGAGE") {
      this.activeIndex = this.selectActiveInterceptor(target);
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        d.saveTrail();
        if (i === this.activeIndex) {
          const dist = Math.sqrt((d.x - target.x) ** 2 + (d.y - target.y) ** 2 + (d.z - target.z) ** 2);
          if (dist > this.strikeThreshold) {
            this.predictivePursuit(target, i);
          } else {
            this.directPursuit(target, i);
          }
        } else {
          this.orbitFormation(target, i);
        }
        d.z = world.clampZ(d.z);
        d.x = world.clampX(d.x);
        d.y = world.clampY(d.y);
      }
    } else {
      const speed = 2.5;
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        d.saveTrail();
        const slot = this.formationSlot(target, i);
        const dx = slot.x - d.x;
        const dy = slot.y - d.y;
        const dz = slot.z - d.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 1) {
          d.x += (dx / dist) * speed;
          d.y += (dy / dist) * speed;
          d.z += (dz / dist) * speed;
        }
        d.z = world.clampZ(d.z);
        d.x = world.clampX(d.x);
        d.y = world.clampY(d.y);
      }
    }
  }
}
