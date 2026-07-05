export class Drone {
  x: number;
  y: number;
  z: number;
  trail: { x: number; y: number; z: number }[] = [];
  maxTrail = 20;

  constructor(x: number, y: number, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  saveTrail(): void {
    this.trail.push({ x: this.x, y: this.y, z: this.z });
    if (this.trail.length > this.maxTrail) this.trail.shift();
  }
}
