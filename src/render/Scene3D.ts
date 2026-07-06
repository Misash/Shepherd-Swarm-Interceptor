import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { COLORS } from "./Colors";

export class Scene3D {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  container: HTMLElement;

  static readonly CENTER_X = 15;
  static readonly CENTER_Z = -15;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(25, 20, -25);
    this.camera.lookAt(Scene3D.CENTER_X, 0, Scene3D.CENTER_Z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(Scene3D.CENTER_X, 0, Scene3D.CENTER_Z);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.update();

    this.setupLights();
    this.setupGround();

    window.addEventListener("resize", () => this.resize());
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(20, 30, -10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
    fill.position.set(-10, 10, 10);
    this.scene.add(fill);
  }

  private setupGround(): void {
    const cx = Scene3D.CENTER_X;
    const cz = Scene3D.CENTER_Z;

    const grid = new THREE.GridHelper(40, 40, COLORS.grid, COLORS.grid);
    grid.position.set(cx, 0, cz);
    this.scene.add(grid);

    const axes = new THREE.AxesHelper(5);
    axes.position.set(cx, 0, cz);
    this.scene.add(axes);

    const geo = new THREE.PlaneGeometry(40, 40);
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(cx, -0.05, cz);
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
