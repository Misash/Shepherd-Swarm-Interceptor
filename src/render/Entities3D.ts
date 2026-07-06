import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Shahed } from "../sim/Shahed";
import { Swarm } from "../sim/Swarm";
import { COLORS, PHASE_COLORS_HEX } from "./Colors";

function makeTrail(maxLen: number, color: number): THREE.Line {
  const pos = new Float32Array(maxLen * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
  return new THREE.Line(geo, mat);
}

function updateTrail(line: THREE.Line, trail: { x: number; y: number; z: number }[]): void {
  const pos = line.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < trail.length; i++) {
    pos[i * 3] = trail[i].x;
    pos[i * 3 + 1] = trail[i].z;
    pos[i * 3 + 2] = -trail[i].y;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.setDrawRange(0, trail.length);
}

export class Entities3D {
  private scene: THREE.Scene;

  private shahedGroup: THREE.Group;
  private shahedCone: THREE.Mesh;
  private shahedTrail: THREE.Line;

  private predLine: THREE.Line;
  private predMarker: THREE.Mesh;

  private droneGroups: THREE.Group[] = [];
  private droneModelTemplate: THREE.Group | null = null;
  private droneGlows: (THREE.Mesh | null)[] = [];
  private droneTrails: THREE.Line[] = [];

  private formationGroup: THREE.Group;
  private formationCircle: THREE.Line;
  private formationSquare: THREE.Line;
  private slotGhosts: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.shahedGroup = new THREE.Group();

    // Placeholder sphere while GLB loads
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.shahed, emissive: COLORS.shahedGlow, emissiveIntensity: 0.3 })
    );
    body.castShadow = true;
    this.shahedGroup.add(body);

    this.shahedCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: COLORS.shahed, emissive: COLORS.shahedGlow, emissiveIntensity: 0.5 })
    );
    this.shahedCone.position.set(0.6, 0, 0);
    this.shahedGroup.add(this.shahedCone);

    // Load Shahed-136 GLB model – reemplaza el placeholder al cargar
    const loader = new GLTFLoader();
    loader.load("/shahed-136.glb", (gltf) => {
      const model = gltf.scene;

      this.shahedGroup.remove(body);
      body.geometry.dispose();
      (body.material as THREE.Material).dispose();
      this.shahedGroup.remove(this.shahedCone);
      this.shahedCone.geometry.dispose();
      (this.shahedCone.material as THREE.Material).dispose();

      model.scale.set(1.2, 1.2, 1.2);
      model.rotation.y = Math.PI / 2;
      model.position.y = -2.3;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0xffffff);
          mat.emissive?.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      });

      this.shahedGroup.add(model);
    });

    const droneLoader = new GLTFLoader();
    droneLoader.load("/drone.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(5, 10, 10);
      model.rotation.y = Math.PI / 2;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.color.setHex(COLORS.drone);
        }
      });
      this.droneModelTemplate = model;

      for (const group of this.droneGroups) {
        this.replaceGroupPlaceholder(group);
      }
    });

    scene.add(this.shahedGroup);

    this.formationGroup = new THREE.Group();
    this.formationGroup.visible = false;
    const formRadius = 5;
    const CIRCLE_SEGMENTS = 48;
    const circlePts: THREE.Vector3[] = [];
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const theta = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(
        0, formRadius * Math.sin(theta), formRadius * Math.cos(theta)
      ));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
    this.formationCircle = new THREE.Line(
      circleGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    this.formationGroup.add(this.formationCircle);

    const sqPts: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      sqPts.push(new THREE.Vector3(
        0, formRadius * Math.sin(angle), formRadius * Math.cos(angle)
      ));
    }
    sqPts.push(sqPts[0].clone());
    const sqGeo = new THREE.BufferGeometry().setFromPoints(sqPts);
    this.formationSquare = new THREE.Line(
      sqGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    this.formationGroup.add(this.formationSquare);
    scene.add(this.formationGroup);

    const slotGhostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const R = formRadius;
    const ghostPositions = [
      { pos: [0, 0, -R], rot: [0, Math.PI, 0] },
      { pos: [0, R, 0], rot: [-Math.PI / 2, 0, 0] },
      { pos: [0, 0, R], rot: [0, 0, 0] },
      { pos: [0, -R, 0], rot: [Math.PI / 2, 0, 0] },
    ];
    for (const gp of ghostPositions) {
      const ghost = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.35, 12), slotGhostMat);
      ghost.position.set(gp.pos[0], gp.pos[1], gp.pos[2]);
      ghost.rotation.set(gp.rot[0], gp.rot[1], gp.rot[2]);
      this.shahedGroup.add(ghost);
      this.slotGhosts.push(ghost);
    }

    this.shahedTrail = makeTrail(30, COLORS.trailShahed);
    scene.add(this.shahedTrail);

    const predPosArr = new Float32Array(6);
    const predGeo = new THREE.BufferGeometry();
    predGeo.setAttribute("position", new THREE.BufferAttribute(predPosArr, 3));
    this.predLine = new THREE.Line(
      predGeo,
      new THREE.LineDashedMaterial({ color: COLORS.prediction, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.6 })
    );
    scene.add(this.predLine);

    this.predMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.prediction, transparent: true, opacity: 0.5 })
    );
    scene.add(this.predMarker);

  }

  initDrones(count: number): void {
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();

      if (this.droneModelTemplate) {
        group.add(this.droneModelTemplate.clone(true));
      } else {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 12, 12),
          new THREE.MeshStandardMaterial({ color: COLORS.drone })
        );
        mesh.castShadow = true;
        group.add(mesh);
      }

      this.scene.add(group);
      this.droneGroups.push(group);

      const isStriker = i === 0;
      const g = isStriker
        ? new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 12, 12),
            new THREE.MeshBasicMaterial({ color: COLORS.strikerGlow, transparent: true, opacity: 0.12 })
          )
        : null;
      if (g) this.scene.add(g);
      this.droneGlows.push(g);

      this.droneTrails.push(makeTrail(20, COLORS.trail));
    }
  }

  private replaceGroupPlaceholder(group: THREE.Group): void {
    while (group.children.length) {
      const c = group.children[0];
      group.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
    group.add(this.droneModelTemplate!.clone(true));
  }

  update(shahed: Shahed, swarm: Swarm): void {
    const sx = shahed.x;
    const sy = shahed.z;
    const sz = -shahed.y;
    this.shahedGroup.position.set(sx, sy, sz);

    const heading = shahed.heading();
    this.shahedGroup.rotation.set(0, heading, 0);

    updateTrail(this.shahedTrail, shahed.trail);

    const pred = shahed.predictedPosition(1.0);
    const predPos = this.predLine.geometry.attributes.position.array as Float32Array;
    predPos[0] = shahed.x;
    predPos[1] = shahed.z;
    predPos[2] = -shahed.y;
    predPos[3] = pred.x;
    predPos[4] = pred.z;
    predPos[5] = -pred.y;
    this.predLine.geometry.attributes.position.needsUpdate = true;
    this.predLine.computeLineDistances();
    this.predLine.visible = swarm.phase !== "ASCEND";

    this.predMarker.position.set(pred.x, pred.z, -pred.y);
    this.predMarker.visible = swarm.phase !== "ASCEND";

    for (let i = 0; i < swarm.drones.length; i++) {
      if (i >= this.droneGroups.length) break;
      const d = swarm.drones[i];
      const dx = d.x, dy = d.z, dz = -d.y;
      this.droneGroups[i].position.set(dx, dy, dz);

      const isStriker = i === swarm.activeIndex;
      if (this.droneGlows[i]) {
        this.droneGlows[i]!.position.set(dx, dy, dz);
        this.droneGlows[i]!.visible = isStriker;
      }

      if (i < this.droneTrails.length) {
        updateTrail(this.droneTrails[i], d.trail);
      }

      const phaseColor = PHASE_COLORS_HEX[swarm.phase];
      this.droneGroups[i].traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.color.setHex(phaseColor);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      });
    }

    for (const ghost of this.slotGhosts) {
      (ghost.material as THREE.MeshBasicMaterial).color.setHex(PHASE_COLORS_HEX[swarm.phase]);
    }

    const inForm = swarm.phase === "FORM";
    this.formationGroup.visible = inForm;
    if (inForm) {
      let cx = 0, cy = 0, cz = 0;
      for (const d of swarm.drones) {
        cx += d.x; cy += d.z; cz += -d.y;
      }
      cx /= swarm.drones.length;
      cy /= swarm.drones.length;
      cz /= swarm.drones.length;
      this.formationGroup.position.set(cx, cy, cz);
      this.formationGroup.rotation.set(0, heading, 0);
      const phaseColor = PHASE_COLORS_HEX[swarm.phase];
      (this.formationCircle.material as THREE.LineBasicMaterial).color.setHex(phaseColor);
      (this.formationSquare.material as THREE.LineBasicMaterial).color.setHex(phaseColor);
    }

    if (swarm.eliminated !== null && swarm.eliminated < this.droneGroups.length) {
      this.droneGroups[swarm.eliminated].traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.color.setHex(COLORS.eliminated);
          mat.emissive.setHex(COLORS.eliminated);
          mat.emissiveIntensity = 0.6;
        }
      });
    }
  }
}
