import * as THREE from 'three';
import { lumpy, merge, paint, place, seeded } from './clay';
import { ISLAND_RADIUS, islandModel, type IslandStyle } from './islands';
import { WORLDS } from './worlds';

/**
 * The 3D engine behind the world hub (Z1), a subject world (Z2) and its
 * chapter path (Z3, the same world with a closer camera). One WebGL scene,
 * clay islands built from shapes at runtime (nothing to download), pins drawn
 * as ordinary HTML buttons on top so they stay readable, tappable (56 px) and
 * reachable by keyboard and screen readers.
 *
 * The scene renders only while something moves; with reduced motion there is
 * no fly-in, no auto-spin and no drifting clouds, and camera moves snap.
 */

export type SceneMode = 'hub' | 'world';

export interface Pin {
  id: string;
  position: THREE.Vector3;
}

export interface PinScreen {
  x: number;
  y: number;
  /** In front of the camera and inside the view. */
  visible: boolean;
  /** 0 = nearest; used to stack pins. */
  depth: number;
}

export interface CameraPose {
  target: THREE.Vector3;
  distance: number;
  /** Degrees above the horizon. */
  pitch: number;
  /** Radians around the vertical axis. */
  yaw: number;
}

export interface SceneStats {
  /** ms from construction to the first rendered frame. */
  firstFrameMs: number | null;
  /** Average frames per second over the last second of animation (null until measured). */
  fps: number | null;
  drawCalls: number;
  triangles: number;
  /** GPU resources held (renderer.info.memory). */
  geometries?: number;
  textures?: number;
}

export interface IslandSceneOptions {
  mode: SceneMode;
  /** World mode: which island to show. */
  style?: IslandStyle;
  reducedMotion: boolean;
  onPins?: (pins: Map<string, PinScreen>) => void;
  /** Hub mode: an island was tapped. */
  onIslandTap?: (subjectId: string) => void;
  /** First frame rendered (for the loading cover and measurements). */
  onReady?: (stats: SceneStats) => void;
}

const WORLD_SCALE = 1.9;
const HUB_RING = 5.0;
const HUB_HEIGHTS = [0.15, 0.55, 0.25, -0.15, 0.35, 0];
const IDLE_SPIN_DELAY_MS = 6000;
const SPIN_SPEED = THREE.MathUtils.degToRad(2); // per second
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Flight {
  from: CameraPose;
  to: CameraPose;
  start: number;
  duration: number;
  resolve: () => void;
}

export function hubIslandPosition(order: number): THREE.Vector3 {
  const a = (order / 6) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(Math.cos(a) * HUB_RING, HUB_HEIGHTS[order] ?? 0, Math.sin(a) * HUB_RING);
}

/** Yaw that puts the camera outside the ring, looking at the island from the front. */
export function yawFacing(position: THREE.Vector3): number {
  return Math.atan2(position.x, position.z);
}

export class IslandScene {
  readonly mode: SceneMode;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  private readonly islands = new Map<string, THREE.Mesh>();
  private readonly halos = new Map<string, THREE.Mesh>();
  private readonly disposables: { dispose(): void }[] = [];
  private readonly opts: IslandSceneOptions;
  private readonly createdAt = performance.now();
  private pose: CameraPose;
  private rest: CameraPose;
  private flight: Flight | null = null;
  private pins: Pin[] = [];
  private path: THREE.Mesh | null = null;
  private clouds: THREE.Object3D | null = null;
  private raf = 0;
  private dirty = true;
  private running = false;
  private lastFrame = 0;
  private lastInput = performance.now();
  private yawVelocity = 0;
  private drag: { id: number; x: number; y: number; moved: number; lastX: number; lastY: number; lastT: number } | null = null;
  private frameTimes: number[] = [];
  private firstFrameMs: number | null = null;
  private reducedMotion: boolean;
  private bounds = 2.6;
  /** Extra camera distance so the whole ring fits narrow (phone) panels. */
  private fit = 1;
  /** Raise the look-at point on tall screens so the island sits below the header. */
  private lift = 0;
  private liftEnabled = true;
  private visible = true;
  private observer: IntersectionObserver | null = null;

  constructor(canvas: HTMLCanvasElement, opts: IslandSceneOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.mode = opts.mode;
    this.reducedMotion = opts.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene.add(new THREE.HemisphereLight('#fff6ea', '#a07d5e', 1.75));
    const sun = new THREE.DirectionalLight('#fff0d8', 1.9);
    sun.position.set(6, 12, 8);
    // Soft shadows give the clay islands depth: one 1024 shadow map, landmarks shade the grass.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const reach = opts.mode === 'hub' ? 9 : 6.5;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 40 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    this.scene.fog = new THREE.Fog('#f6e7d6', 26, 60);

    if (opts.mode === 'hub') this.buildHub();
    else this.buildWorld(opts.style ?? 'science');
    this.buildClouds();

    this.rest =
      opts.mode === 'hub'
        ? { target: new THREE.Vector3(0, 0.2, 0), distance: 17, pitch: 28, yaw: 0.35 }
        : { target: new THREE.Vector3(0, 0.6, 0.3), distance: 13.5, pitch: 35, yaw: 0 };
    this.pose = this.reducedMotion
      ? clonePose(this.rest)
      : { ...clonePose(this.rest), distance: this.rest.distance * (opts.mode === 'hub' ? 1.7 : 1.5), pitch: this.rest.pitch + 22 };

    this.attachInput();
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.wake();
    });
    this.observer.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    if (!this.reducedMotion) void this.flyTo(this.rest, 1200);
    this.start();
  }

  // ---------------------------------------------------------------- building

  private material(): THREE.MeshLambertMaterial {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.disposables.push(m);
    return m;
  }

  private buildHub() {
    for (const world of WORLDS) {
      const model = islandModel(world.style);
      const mesh = new THREE.Mesh(model.geometry, this.material());
      mesh.position.copy(hubIslandPosition(world.order));
      mesh.rotation.y = -yawFacing(mesh.position) + Math.PI * 0.08;
      mesh.userData.subjectId = world.subjectId;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.islands.set(world.subjectId, mesh);
      this.scene.add(mesh);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_RADIUS * 1.08, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: '#f6be32', transparent: true, opacity: 0.9 }));
      halo.rotation.x = Math.PI / 2;
      halo.position.copy(mesh.position).add(new THREE.Vector3(0, 0.12, 0));
      halo.visible = false;
      this.disposables.push(halo.geometry, halo.material as THREE.Material);
      this.halos.set(world.subjectId, halo);
      this.scene.add(halo);
    }
    this.buildBridges();
  }

  private buildBridges() {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const a = hubIslandPosition(i);
      const b = hubIslandPosition((i + 1) % 6);
      const dir = b.clone().sub(a).setY(0).normalize();
      const start = a.clone().addScaledVector(dir, ISLAND_RADIUS * 0.9).setY(a.y + 0.18);
      const end = b.clone().addScaledVector(dir, -ISLAND_RADIUS * 0.9).setY(b.y + 0.18);
      const span = start.distanceTo(end);
      const n = Math.max(4, Math.round(span / 0.2));
      const yaw = Math.atan2(dir.x, dir.z);
      const side = new THREE.Vector3(dir.z, 0, -dir.x);
      const ropeL: THREE.Vector3[] = [];
      const ropeR: THREE.Vector3[] = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const p = start.clone().lerp(end, t);
        p.y -= Math.sin(Math.PI * t) * 0.32;
        if (k < n) parts.push(place(paint(new THREE.BoxGeometry(0.34, 0.035, 0.13), k % 2 ? '#b98552' : '#a87445', 0), { x: p.x, y: p.y, z: p.z, ry: yaw }));
        ropeL.push(p.clone().addScaledVector(side, 0.17).setY(p.y + 0.16));
        ropeR.push(p.clone().addScaledVector(side, -0.17).setY(p.y + 0.16));
      }
      for (const rope of [ropeL, ropeR]) parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rope), n * 2, 0.018, 5), '#7b5a3e', 0));
    }
    const mesh = new THREE.Mesh(merge(parts), this.material());
    mesh.castShadow = true;
    this.disposables.push(mesh.geometry);
    this.scene.add(mesh);
  }

  private buildWorld(style: IslandStyle) {
    const model = islandModel(style);
    const mesh = new THREE.Mesh(model.geometry, this.material());
    mesh.scale.setScalar(WORLD_SCALE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.islands.set(style, mesh);
    this.scene.add(mesh);
    this.bounds = ISLAND_RADIUS * WORLD_SCALE * 0.75;
  }

  private buildClouds() {
    const rnd = seeded(this.mode === 'hub' ? 7 : 13);
    const parts: THREE.BufferGeometry[] = [];
    const count = this.mode === 'hub' ? 16 : 10;
    const spread = this.mode === 'hub' ? 9 : 6.5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd() * 0.4;
      const r = spread * (0.55 + rnd() * 0.6);
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const cy = -2.6 - rnd() * 1.6;
      for (let k = 0; k < 4; k++) {
        const s = 0.7 + rnd() * 0.9;
        parts.push(place(paint(lumpy(new THREE.IcosahedronGeometry(1, 1), 0.08, i * 7 + k), '#ffffff', 0.18), { x: cx + (k - 1.5) * 0.85, y: cy + rnd() * 0.3, z: cz + rnd() * 0.6, s, sy: s * 0.6 }));
      }
    }
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.96 }));
    this.disposables.push(mesh.geometry, mesh.material as THREE.Material);
    this.clouds = mesh;
    this.scene.add(mesh);
  }

  // ------------------------------------------------------------- public API

  /** Island centre (hub) or landmark anchors (world), in scene coordinates. */
  hubAnchor(subjectId: string): THREE.Vector3 {
    const mesh = this.islands.get(subjectId);
    return mesh ? mesh.position.clone().add(new THREE.Vector3(0, 1.7, 0)) : new THREE.Vector3();
  }

  islandCentre(subjectId: string): THREE.Vector3 {
    return this.islands.get(subjectId)?.position.clone() ?? new THREE.Vector3();
  }

  /**
   * Anchors for `count` chapter pins on the world island: the island's
   * landmarks first, then extra spots around the rim if a class has more
   * chapters than landmarks.
   */
  worldAnchors(style: IslandStyle, count: number): THREE.Vector3[] {
    const model = islandModel(style);
    const anchors = model.anchors.map((a) => a.clone().multiplyScalar(WORLD_SCALE));
    const extra = Math.max(0, count - anchors.length);
    for (let i = 0; i < extra; i++) {
      const a = (i / Math.max(extra, 1)) * Math.PI * 2 + 0.3;
      const r = ISLAND_RADIUS * WORLD_SCALE * 0.82;
      anchors.push(new THREE.Vector3(Math.cos(a) * r, model.top * WORLD_SCALE + 0.45, Math.sin(a) * r));
    }
    return anchors.slice(0, count);
  }

  /**
   * A winding path of `count` topic anchors that ends at the chapter's
   * landmark, starting from the near side of the island.
   */
  pathAnchors(style: IslandStyle, landmark: THREE.Vector3, count: number): THREE.Vector3[] {
    const top = islandModel(style).top * WORLD_SCALE + 0.05;
    const end = landmark.clone().setY(top);
    const towardCentre = end.clone().setY(0).multiplyScalar(-1);
    if (towardCentre.lengthSq() < 0.01) towardCentre.set(0, 0, 1);
    towardCentre.normalize();
    const radius = ISLAND_RADIUS * WORLD_SCALE * 0.78;
    const start = towardCentre.clone().multiplyScalar(radius * 0.85).setY(top);
    const side = new THREE.Vector3(-towardCentre.z, 0, towardCentre.x);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 1 : i / (count - 1);
      const p = start.clone().lerp(end, t);
      p.addScaledVector(side, Math.sin(t * Math.PI * 2.2) * 0.85 * (1 - t * 0.6));
      const len = Math.hypot(p.x, p.z);
      if (len > radius) p.multiplyScalar(radius / len).setY(top);
      points.push(p);
    }
    return points;
  }

  /** Draws (or removes) the dotted path between topic nodes. */
  setPath(points: THREE.Vector3[] | null) {
    if (this.path) {
      this.scene.remove(this.path);
      this.path.geometry.dispose();
      (this.path.material as THREE.Material).dispose();
      this.path = null;
    }
    if (points && points.length > 1) {
      const curve = new THREE.CatmullRomCurve3(points);
      const dots = Math.round(curve.getLength() / 0.22);
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i <= dots; i++) {
        const p = curve.getPoint(i / dots);
        parts.push(place(paint(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 10), '#fbf3e2', 0), { x: p.x, y: p.y + 0.02, z: p.z }));
      }
      this.path = new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
      this.scene.add(this.path);
    }
    this.dirty = true;
    this.wake();
  }

  setPins(pins: Pin[]) {
    this.pins = pins;
    this.dirty = true;
    this.wake();
  }

  /** Gold halo on the islands that hold this week's chapter (hub). */
  setHighlighted(subjectIds: readonly string[]) {
    for (const [id, halo] of this.halos) halo.visible = subjectIds.includes(id);
    this.dirty = true;
    this.wake();
  }

  /** The chapter path frames its own camera; the world overview lifts the island clear of the header. */
  setLiftEnabled(value: boolean) {
    this.liftEnabled = value;
    this.resize();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    this.wake();
  }

  /** Where the camera rests when nothing is focused. */
  get restPose(): CameraPose {
    return clonePose(this.rest);
  }

  /** Moves the camera (1.2 s fly-in by default; instant with reduced motion). */
  flyTo(to: CameraPose, duration = 1200): Promise<void> {
    if (this.flight) this.flight.resolve();
    if (this.reducedMotion || duration <= 0) {
      this.pose = clonePose(to);
      this.flight = null;
      this.dirty = true;
      this.wake();
      return Promise.resolve();
    }
    const from = clonePose(this.pose);
    const target = clonePose(to);
    // Take the short way round.
    target.yaw = from.yaw + shortestAngle(from.yaw, target.yaw);
    return new Promise((resolve) => {
      this.flight = { from, to: target, start: performance.now(), duration, resolve };
      this.wake();
    });
  }

  /** Fly towards a hub island (S1: hub to world, 1.2 s). */
  flyToIsland(subjectId: string, duration = 1200): Promise<void> {
    const centre = this.islandCentre(subjectId);
    return this.flyTo({ target: centre.clone().add(new THREE.Vector3(0, 0.5, 0)), distance: 6.5, pitch: 34, yaw: yawFacing(centre) }, duration);
  }

  /** Set the resting pose (e.g. near zoom on a chapter) and fly there. */
  setRest(pose: CameraPose, duration = 800): Promise<void> {
    this.rest = clonePose(pose);
    return this.flyTo(pose, duration);
  }

  stats(): SceneStats {
    const fps = this.frameTimes.length >= 20 ? Math.round(1000 / (this.frameTimes.reduce((s, t) => s + t, 0) / this.frameTimes.length)) : null;
    const info = this.renderer.info;
    return { firstFrameMs: this.firstFrameMs, fps, drawCalls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the whole ring in view on narrow (portrait) screens.
    this.camera.fov = this.mode === 'hub' ? (w / h < 1 ? 52 : 36) : w / h < 0.8 ? 50 : 38;
    // Narrow screens: pull back so the ring (hub) or the island (world) fits.
    this.fit = this.mode === 'hub' ? (w < 440 ? 1.14 : 1) : w / h < 0.7 ? 1.3 : 1;
    this.lift = this.liftEnabled && this.mode === 'world' && w / h < 0.7 ? 1.5 : 0;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.wake();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.detachInput();
    this.setPath(null);
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }

  // ------------------------------------------------------------------ input

  private attachInput() {
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
  }

  private detachInput() {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
  }

  private onDown = (e: PointerEvent) => {
    if (this.drag) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, lastX: e.clientX, lastY: e.clientY, lastT: performance.now() };
    this.yawVelocity = 0;
    this.lastInput = performance.now();
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    const now = performance.now();
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (this.flight) return;
    if (this.mode === 'hub') {
      const delta = -dx * 0.008;
      this.pose.yaw += delta;
      this.yawVelocity = (delta / Math.max(1, now - d.lastT)) * 1000;
    } else {
      // Pan within the island bounds (screen-aligned).
      const scale = this.pose.distance * 0.0016;
      const right = new THREE.Vector3(Math.cos(this.pose.yaw), 0, -Math.sin(this.pose.yaw));
      const forward = new THREE.Vector3(Math.sin(this.pose.yaw), 0, Math.cos(this.pose.yaw));
      this.pose.target.addScaledVector(right, -dx * scale).addScaledVector(forward, -dy * scale);
      const flat = Math.hypot(this.pose.target.x, this.pose.target.z);
      if (flat > this.bounds) {
        this.pose.target.x *= this.bounds / flat;
        this.pose.target.z *= this.bounds / flat;
      }
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;
    this.lastInput = now;
    this.dirty = true;
    this.wake();
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    this.lastInput = performance.now();
    if (d.moved < 8 && this.mode === 'hub') {
      const id = this.pick(e.clientX, e.clientY);
      if (id) this.opts.onIslandTap?.(id);
    }
    if (this.reducedMotion) this.yawVelocity = 0;
    this.wake();
  };

  private onDoubleClick = () => {
    if (this.mode !== 'world') return;
    // Two zoom levels only: far (all chapters) and near.
    const near = this.pose.distance < this.rest.distance * 0.8;
    void this.flyTo({ ...this.pose, target: this.pose.target.clone(), distance: near ? this.rest.distance : this.rest.distance * 0.55 }, 400);
  };

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects([...this.islands.values()], false)[0];
    return (hit?.object.userData.subjectId as string | undefined) ?? null;
  }

  // ------------------------------------------------------------------- loop

  private onVisibility = () => {
    if (!document.hidden) this.wake();
  };

  private start() {
    this.running = true;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private wake() {
    if (!this.running) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
  }

  private animating(now: number): boolean {
    if (this.flight || this.drag) return true;
    if (this.reducedMotion) return false;
    if (Math.abs(this.yawVelocity) > 0.002) return true;
    // Gentle cloud drift and (hub) auto-spin after 6 s idle.
    return now - this.lastInput > 0 || this.mode === 'hub';
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (this.flight) {
      const f = this.flight;
      const t = Math.min(1, (now - f.start) / f.duration);
      const k = easeOut(t);
      this.pose = {
        target: f.from.target.clone().lerp(f.to.target, k),
        distance: THREE.MathUtils.lerp(f.from.distance, f.to.distance, k),
        pitch: THREE.MathUtils.lerp(f.from.pitch, f.to.pitch, k),
        yaw: THREE.MathUtils.lerp(f.from.yaw, f.to.yaw, k),
      };
      this.dirty = true;
      if (t >= 1) {
        this.flight = null;
        f.resolve();
      }
    } else if (!this.drag && !this.reducedMotion) {
      if (Math.abs(this.yawVelocity) > 0.002) {
        this.pose.yaw += this.yawVelocity * dt;
        this.yawVelocity *= Math.pow(0.05, dt);
        this.dirty = true;
      } else if (this.mode === 'hub' && now - this.lastInput > IDLE_SPIN_DELAY_MS) {
        this.pose.yaw += SPIN_SPEED * dt;
        this.dirty = true;
      }
    }
    if (this.clouds && !this.reducedMotion) {
      this.clouds.rotation.y += dt * 0.01;
      // A subject world floats gently (the hub's islands stay still: the rope bridges join them).
      if (this.mode === 'world') for (const island of this.islands.values()) island.position.y = Math.sin(now / 1600) * 0.06;
      this.dirty = true;
    }

    const shouldRender = this.dirty && this.visible && !document.hidden;
    if (shouldRender) {
      this.render();
      this.dirty = false;
      if (dt > 0 && this.firstFrameMs !== null) {
        this.frameTimes.push(dt * 1000);
        if (this.frameTimes.length > 60) this.frameTimes.shift();
      }
    }
    if (this.visible && !document.hidden && this.animating(now)) this.raf = requestAnimationFrame(this.frame);
  };

  private render() {
    const { target, pitch, yaw } = this.pose;
    const distance = this.pose.distance * this.fit;
    const p = THREE.MathUtils.degToRad(pitch);
    const look = target.clone().setY(target.y + this.lift);
    this.camera.position.set(look.x + Math.sin(yaw) * Math.cos(p) * distance, look.y + Math.sin(p) * distance, look.z + Math.cos(yaw) * Math.cos(p) * distance);
    this.camera.lookAt(look);
    this.renderer.render(this.scene, this.camera);
    if (this.firstFrameMs === null) {
      this.firstFrameMs = Math.round(performance.now() - this.createdAt);
      // Engine-test measurements (wireframe Z: "set after the engine test").
      performance.mark(`laarish:${this.mode}-first-frame`);
      registerForPerf(this);
      this.opts.onReady?.(this.stats());
    }
    this.projectPins();
  }

  private projectPins() {
    if (!this.opts.onPins || this.pins.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const out = new Map<string, PinScreen>();
    const v = new THREE.Vector3();
    const distances = this.pins.map((pin) => pin.position.distanceTo(this.camera.position));
    const near = Math.min(...distances);
    const far = Math.max(...distances);
    this.pins.forEach((pin, i) => {
      v.copy(pin.position).project(this.camera);
      const visible = v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05;
      out.set(pin.id, { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, visible, depth: far > near ? (distances[i] - near) / (far - near) : 0 });
    });
    this.opts.onPins(out);
  }
}

/** With `?perf` in the URL, scenes are listed on window.__laarishScenes so their stats can be read. */
export function registerForPerf(scene: { stats(): unknown }) {
  if (typeof window === 'undefined' || !new URLSearchParams(window.location.search).has('perf')) return;
  const w = window as unknown as { __laarishScenes?: { stats(): unknown }[] };
  (w.__laarishScenes ??= []).push(scene);
}

function clonePose(p: CameraPose): CameraPose {
  return { target: p.target.clone(), distance: p.distance, pitch: p.pitch, yaw: p.yaw };
}

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
