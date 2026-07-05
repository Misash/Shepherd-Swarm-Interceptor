import { World } from "./sim/World";
import { Shahed } from "./sim/Shahed";
import { Drone } from "./sim/Drone";
import { Swarm } from "./sim/Swarm";
import { Scene3D } from "./render/Scene3D";
import { Entities3D } from "./render/Entities3D";
import { Dashboard } from "./ui/Dashboard";

// ─── Simulation ───
const world = new World(20, 20, 10);
const shahed = new Shahed(2, 2, 5, 1, 0.5, 0);
const drones = [new Drone(1, 7), new Drone(4, 6), new Drone(2, 5), new Drone(8, 8)];
const swarm = new Swarm(drones);

// ─── 3D ───
const container = document.getElementById("three-container")!;
const scene3D = new Scene3D(container);
const entities = new Entities3D(scene3D.scene);
entities.initDrones(drones.length);

// ─── UI ───
const dashboard = new Dashboard();

// ─── State ───
let iter = 1;
let paused = false;
let gameOver = false;

// ─── Time-based stepping ───
const BASE_TICK_MS = 500;          // ms per tick at 1× speed
let lastStepTime = performance.now();
let stepAccumulator = 0;

function stepSimulation(): void {
  if (gameOver) return;
  shahed.move(world);
  swarm.moveDrones(shahed, world);
  swarm.step(shahed, iter);
  if (swarm.intercepted(shahed)) gameOver = true;
  iter++;
}

// ─── Keyboard controls ───
document.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    paused = !paused;
  }
  const n = parseFloat(e.key);
  if (!isNaN(n) && n >= 0 && n <= 9) {
    const slider = document.getElementById("speedSlider") as HTMLInputElement;
    slider.value = String(n <= 0 ? 0.1 : n);
  }
  if (e.key === "r" || e.key === "R") resetSimulation();
});

// ─── Speed preset buttons ───
document.querySelectorAll("[data-speed]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const slider = document.getElementById("speedSlider") as HTMLInputElement;
    slider.value = (btn as HTMLElement).dataset.speed!;
  });
});

// ─── Play/Pause button ───
document.getElementById("playBtn")!.addEventListener("click", () => {
  paused = !paused;
});

// ─── Stop button ───
document.getElementById("stopBtn")!.addEventListener("click", () => {
  resetSimulation();
  paused = true;
});

function resetSimulation(): void {
  Object.assign(shahed, new Shahed(2, 2, 5, 1, 0.5, 0));
  swarm.drones = [new Drone(1, 7), new Drone(4, 6), new Drone(2, 5), new Drone(8, 8)];
  swarm.phase = "ASCEND";
  swarm.phaseStartTime = 0;
  swarm.activeIndex = null;
  swarm.eliminated = null;
  iter = 1;
  gameOver = false;
  lastStepTime = performance.now();
  stepAccumulator = 0;
}

// ─── Game loop ───
function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const speed = dashboard.speed;
  const tickInterval = BASE_TICK_MS / speed;

  if (!paused && !gameOver) {
    const delta = now - lastStepTime;
    lastStepTime = now;
    stepAccumulator += delta;

    while (stepAccumulator >= tickInterval) {
      stepAccumulator -= tickInterval;
      stepSimulation();
    }
  } else {
    stepAccumulator = 0;
    lastStepTime = now;
  }

  const actualStepsPerSec = speed * (1000 / BASE_TICK_MS);

  entities.update(shahed, swarm);
  dashboard.update(shahed, swarm, iter, paused, actualStepsPerSec);
  scene3D.render();
}

animate();
