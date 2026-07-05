import { Shahed } from "../sim/Shahed";
import { Swarm } from "../sim/Swarm";
import { PHASE_COLORS } from "../sim/types";

const $ = (id: string) => document.getElementById(id)!;

export class Dashboard {
  private phaseBadge = $("phaseBadge");
  private phaseTime = $("phaseTime");
  private simTime = $("simTime");
  private avgDist = $("avgDist");
  private strikerDist = $("strikerDist");
  private formReadiness = $("formReadiness");
  private targetPos = $("targetPos");
  private targetVel = $("targetVel");
  private targetHeading = $("targetHeading");
  private predictedPos = $("predictedPos");
  private eliminatedRow = $("eliminatedRow");
  private eliminatedBy = $("eliminatedBy");
  private droneTableBody = $("droneTableBody");
  private speedSlider = $("speedSlider") as HTMLInputElement;
  private speedValue = $("speedValue");
  private playBtn = $("playBtn");
  private stepsPerSec = $("stepsPerSec");
  private hudPos = $("hudPos");
  private hudVel = $("hudVel");
  private hudPred = $("hudPred");
  private hudIntercepts = $("hudIntercepts");
  private phaseNotify = $("phaseNotify");

  private lastPhase = "ASCEND";

  get speed(): number {
    return parseFloat(this.speedSlider.value);
  }

  update(shahed: Shahed, swarm: Swarm, iter: number, paused: boolean, actualStepsPerSec: number): void {
    this.phaseBadge.textContent = swarm.phase;
    this.phaseBadge.style.backgroundColor = PHASE_COLORS[swarm.phase];
    this.phaseTime.textContent = `⏱ ${(iter - swarm.phaseStartTime).toFixed(1)}s`;
    this.simTime.textContent = `t = ${iter}`;

    if (swarm.phase !== this.lastPhase) {
      this.showPhaseNotification(swarm.phase);
      this.lastPhase = swarm.phase;
    }

    const avgDistVal = swarm.averageDistance(shahed);
    this.avgDist.textContent = avgDistVal.toFixed(1);

    let strikerDistVal = Infinity;
    if (swarm.activeIndex !== null) {
      const d = swarm.drones[swarm.activeIndex];
      strikerDistVal = Math.sqrt((d.x - shahed.x) ** 2 + (d.y - shahed.y) ** 2);
    }
    this.strikerDist.textContent = strikerDistVal === Infinity ? "—" : strikerDistVal.toFixed(1);

    const formQ = swarm.formationReadiness(shahed);
    this.formReadiness.textContent = `${formQ}/${swarm.drones.length}`;

    this.targetPos.textContent = `(${shahed.x.toFixed(1)}, ${shahed.y.toFixed(1)}, ${shahed.z.toFixed(1)})`;
    this.targetVel.textContent = `(${shahed.vx.toFixed(1)}, ${shahed.vy.toFixed(1)}, ${shahed.vz.toFixed(1)})`;
    this.targetHeading.textContent = `${(shahed.heading() * 180 / Math.PI).toFixed(1)}°`;

    const pred = shahed.predictedPosition(1.0);
    this.predictedPos.textContent = `(${pred.x.toFixed(1)}, ${pred.y.toFixed(1)}, ${pred.z.toFixed(1)})`;

    if (swarm.eliminated !== null) {
      this.eliminatedRow.style.display = "flex";
      this.eliminatedBy.textContent = `Drone ${swarm.eliminated} at t=${iter}`;
    }

    let html = "";
    for (let i = 0; i < swarm.drones.length; i++) {
      const d = swarm.drones[i];
      const dist = Math.sqrt((d.x - shahed.x) ** 2 + (d.y - shahed.y) ** 2);
      const role = i === swarm.activeIndex ? "STRIKER" : "SHEPHERD";
      const status = i === swarm.eliminated ? "★ ELIMINATED" : swarm.phase === "ASCEND" ? "⬆ ascending" : "✅ active";
      html += `<tr>
        <td>D${i}</td>
        <td>${role}</td>
        <td>${d.x.toFixed(1)}</td>
        <td>${d.y.toFixed(1)}</td>
        <td>${d.z.toFixed(1)}</td>
        <td>${dist.toFixed(1)}</td>
        <td>${status}</td>
      </tr>`;
    }
    this.droneTableBody.innerHTML = html;

    this.speedValue.textContent = `${this.speed.toFixed(2)}×`;
    this.playBtn.textContent = paused ? "▶" : "❚❚";
    this.playBtn.classList.toggle("paused", paused);
    this.stepsPerSec.textContent = actualStepsPerSec.toFixed(1);

    this.hudPos.textContent = `(${shahed.x.toFixed(1)}, ${shahed.y.toFixed(1)}, ${shahed.z.toFixed(1)})`;
    this.hudVel.textContent = `(${shahed.vx.toFixed(1)}, ${shahed.vy.toFixed(1)}, ${shahed.vz.toFixed(1)})`;
    this.hudPred.textContent = `(${pred.x.toFixed(1)}, ${pred.y.toFixed(1)}, ${pred.z.toFixed(1)})`;
    this.hudIntercepts.textContent = swarm.eliminated !== null ? "1" : "0";
  }

  private showPhaseNotification(phase: string): void {
    this.phaseNotify.textContent = `◈ ${phase} ◈`;
    this.phaseNotify.style.borderColor = PHASE_COLORS[phase as keyof typeof PHASE_COLORS] || "#fff";
    this.phaseNotify.classList.remove("hidden");
    this.phaseNotify.classList.add("show");
    setTimeout(() => {
      this.phaseNotify.classList.remove("show");
      this.phaseNotify.classList.add("hidden");
    }, 1200);
  }
}
