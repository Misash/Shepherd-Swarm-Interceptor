# Shepherd Swarm Interceptor

> Interactive 3D simulation of the **Shepherd Grid Strategy** — a multi-phase, pack-based algorithm for drone swarm interception.

[![Paper](https://img.shields.io/badge/Paper-arXiv:2508.09536-blue)](https://arxiv.org/html/2508.09536v1)

**Authors:** Kriuk Boris (HKUST), Kriuk Fedor (UTS)

---

## Algorithm Overview

4 interceptor drones pursue a maneuvering target through 5 phases:

```
ASCEND → CHASE → FOLLOW → FORM → ENGAGE
```

| Phase | What happens |
|---|---|
| **ASCEND** | Drones climb to target's altitude |
| **CHASE** | Drones approach target toward formation slots (min 5s) |
| **FOLLOW** | Close proximity maintained (avg distance ≤ 10) |
| **FORM** | Square ring formation established (radius = 5) around target |
| **ENGAGE** | Nearest drone becomes **STRIKER** and intercepts; the other 3 orbit as **SHEPHERDs** |

The target is neutralized when the striker closes within `interceptRadius = 1`.

---

## Key Formulas

**Phase transition** — governed by time, avg distance, and formation quality:

$$S(t+1) = f(S(t), \Delta t, d_{avg}(t), \phi_{formation}(t))$$

**Formation slots** — square ring that rotates with target heading $\theta$:

$$f_i(t) = target(t) + r \cdot \bigl[\cos(i\frac{\pi}{2}) \cdot perp_x,\; \cos(i\frac{\pi}{2}) \cdot perp_y,\; \sin(i\frac{\pi}{2})\bigr]$$

where $perp = [-\sin(\theta), \cos(\theta)]$, $r = 5$.

**Active interceptor** — drone closest to target is selected as striker:

$$active = \arg\min_i \|drone_i - target\|$$

**Predictive pursuit** — striker aims at predicted future position (when distance > 4):

$$p_i(t+1) = p_i(t) + \frac{future - p_i(t)}{\|future - p_i(t)\|} \cdot k_{strike}$$

$$future = target(t) + velocity(t) \cdot \tau_{horizon}$$

where $\tau_{horizon} = 1.0$, $k_{strike} = 2.5$.

**Formation readiness** — at least 3 of 4 drones within tolerance $\epsilon = 3$:

$$\phi_{formation}(t) = \sum_{i=1}^{4} \mathbb{I}\bigl[\|p_i(t) - f_i(t)\| \le \epsilon\bigr]$$

---

## How to Run

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # Production build → dist/
```

---

## Project Structure

```
src/
├── main.ts              # Game loop & bootstrap
├── sim/
│   ├── types.ts         # Phase & role enums
│   ├── World.ts         # 3D grid bounds
│   ├── Shahed.ts        # Target drone with evasive AI
│   ├── Drone.ts         # Interceptor entity
│   └── Swarm.ts         # ★ Core algorithm (~240 lines)
├── render/
│   ├── Scene3D.ts       # Three.js scene, camera, lights
│   ├── Entities3D.ts    # 3D models, trails, ghost formations
│   └── Colors.ts
└── ui/
    ├── Dashboard.ts     # Real-time telemetry panels
    └── style.css
```

The entire Shepherd Grid Strategy lives in **`src/sim/Swarm.ts`** — state machine, formation geometry, role assignment, and pursuit logic in ~240 lines of TypeScript.

---

## Reference:

> Kriuk, B. & Kriuk, F. "Shepherd Grid Strategy: Towards Reliable SWARM Interception." arXiv:2508.09536, 2025.

📄 [arxiv.org/html/2508.09536v1](https://arxiv.org/html/2508.09536v1)

---
