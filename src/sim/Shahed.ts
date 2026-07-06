import { World } from "./World";

export class Shahed {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  trail: { x: number; y: number; z: number }[] = [];
  maxTrail = 30;
  stepsSinceTurn = 0;
  turnInterval = 8;
  speedMag = 1.2;

  constructor(x: number, y: number, z: number = 7, vx: number = 1, vy: number = 0, vz: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
  }

  move(world: World): void {
    this.trail.push({ x: this.x, y: this.y, z: this.z });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    this.stepsSinceTurn++;
    if (this.stepsSinceTurn >= this.turnInterval) {
      this.stepsSinceTurn = 0;
      const delta = Math.random() * 1.2 - 0.6;
      const heading = this.heading() + delta;
      this.vx = this.speedMag * Math.cos(heading);
      this.vy = this.speedMag * Math.sin(heading);
    }

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

  speed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);
  }

  predictedPosition(tau: number): { x: number; y: number; z: number } {
    return {
      x: this.x + this.vx * tau,
      y: this.y + this.vy * tau,
      z: this.z + this.vz * tau,
    };
  }
}
