import * as THREE from 'three';
import type { ObjectArt } from '../domain/types';

/**
 * The Play lesson scene (wireframe L2 / Z4): a fixed camera over a lab table,
 * a horseshoe magnet and the round's objects as small 3D models. Drag an
 * object towards the magnet, or tap it. No physics engine: attraction is a
 * short tween that snaps to the pole; a non-magnetic object just wobbles.
 * With reduced motion objects jump straight to where they end up.
 */

export interface BenchObject {
  id: string;
  art: ObjectArt;
  label: string;
}

export interface BenchOptions {
  reducedMotion: boolean;
  /** The child dropped or tapped an object: test it. */
  onTest: (objectId: string) => void;
  onReady?: (ms: number) => void;
}

const TABLE_TOP = 0;
const MAGNET_X = 2.55;
const POLE_X = 1.62; // where a pulled object touches the poles
const TEST_SPOT = new THREE.Vector3(0.35, TABLE_TOP, -0.15);
const PULL_ZONE = 1.9; // drop this close to the magnet to test

type Mat = THREE.Material;

function phong(color: string, shiny = false, extra: THREE.MeshPhongMaterialParameters = {}): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({ color, shininess: shiny ? 90 : 12, specular: shiny ? '#ffffff' : '#222222', ...extra });
}

const STEEL = '#b9c1cc';
const IRON = '#7d848f';
const COPPER = '#c4703d';
const BRASS = '#d4a640';
const WOOD = '#d9a866';

/** A small, recognisable model for each object picture (about 0.6–1 units long). */
function objectModel(art: ObjectArt, mats: Mat[]): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: Partial<{ x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number }> = {}) => {
    mats.push(mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    m.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    if (p.s) m.scale.setScalar(p.s);
    g.add(m);
    return m;
  };
  const metal = (c: string) => phong(c, true);
  switch (art) {
    case 'iron-nail':
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 10), metal(IRON), { rz: Math.PI / 2, y: 0.05 });
      add(new THREE.ConeGeometry(0.04, 0.14, 10), metal(IRON), { rz: -Math.PI / 2, x: 0.47, y: 0.05 });
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), metal(IRON), { rz: Math.PI / 2, x: -0.41, y: 0.05 });
      break;
    case 'iron-bolt':
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), metal(IRON), { rz: Math.PI / 2, y: 0.08 });
      add(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 6), metal(IRON), { rz: Math.PI / 2, x: -0.34, y: 0.08 });
      break;
    case 'paper-clip':
    case 'safety-pin':
      add(new THREE.TorusGeometry(0.22, 0.025, 6, 24), metal(STEEL), { rx: Math.PI / 2, y: 0.03, s: 1 }).scale.set(1.5, 0.7, 1);
      add(new THREE.TorusGeometry(0.14, 0.025, 6, 20), metal(STEEL), { rx: Math.PI / 2, y: 0.03, x: 0.05 }).scale.set(1.5, 0.6, 1);
      break;
    case 'copper-coin':
      add(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), metal(COPPER), { y: 0.03 });
      break;
    case 'brass-key':
    case 'steel-key': {
      const c = art === 'brass-key' ? BRASS : STEEL;
      add(new THREE.BoxGeometry(0.55, 0.05, 0.09), metal(c), { x: 0.12, y: 0.03 });
      add(new THREE.TorusGeometry(0.13, 0.05, 8, 18), metal(c), { rx: Math.PI / 2, x: -0.24, y: 0.03 });
      add(new THREE.BoxGeometry(0.06, 0.05, 0.12), metal(c), { x: 0.33, y: 0.03, z: 0.08 });
      break;
    }
    case 'aluminium-can':
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 20), metal('#d6dde6'), { y: 0.31 });
      add(new THREE.CylinderGeometry(0.205, 0.205, 0.2, 20), phong('#e2603d'), { y: 0.33 });
      break;
    case 'aluminium-foil':
      add(new THREE.IcosahedronGeometry(0.24, 0), metal('#dfe5ec'), { y: 0.2 });
      break;
    case 'copper-wire':
      add(new THREE.TorusGeometry(0.2, 0.03, 6, 30), metal(COPPER), { rx: Math.PI / 2, y: 0.04 });
      add(new THREE.TorusGeometry(0.15, 0.03, 6, 30), metal(COPPER), { rx: Math.PI / 2, y: 0.08 });
      break;
    case 'steel-spoon':
      add(new THREE.SphereGeometry(0.16, 16, 10), metal(STEEL), { x: -0.25, y: 0.05 }).scale.set(1.2, 0.35, 0.85);
      add(new THREE.BoxGeometry(0.55, 0.035, 0.07), metal(STEEL), { x: 0.15, y: 0.05 });
      break;
    case 'steel-tumbler':
      add(new THREE.CylinderGeometry(0.22, 0.17, 0.5, 20, 1, true), metal(STEEL), { y: 0.25 });
      add(new THREE.CircleGeometry(0.17, 20), metal(STEEL), { rx: -Math.PI / 2, y: 0.005 });
      break;
    case 'wooden-block':
      add(new THREE.BoxGeometry(0.5, 0.36, 0.4), phong(WOOD), { y: 0.18 });
      break;
    case 'ice-cream-stick':
      add(new THREE.BoxGeometry(0.7, 0.03, 0.1), phong('#ecc890'), { y: 0.02 });
      break;
    case 'cricket-bat':
      add(new THREE.BoxGeometry(0.62, 0.06, 0.18), phong('#e8c07c'), { x: 0.12, y: 0.04 });
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 10), phong('#2f5d8a'), { rz: Math.PI / 2, x: -0.33, y: 0.04 });
      break;
    case 'wooden-chair':
      add(new THREE.BoxGeometry(0.36, 0.05, 0.36), phong(WOOD), { y: 0.26 });
      add(new THREE.BoxGeometry(0.36, 0.34, 0.05), phong(WOOD), { y: 0.45, z: -0.16 });
      for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) add(new THREE.BoxGeometry(0.05, 0.26, 0.05), phong(WOOD), { x, y: 0.13, z });
      break;
    case 'plastic-ruler':
      add(new THREE.BoxGeometry(0.85, 0.03, 0.16), phong('#f2c53d', true, { transparent: true, opacity: 0.92 }), { y: 0.02 });
      break;
    case 'plastic-straw':
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 10), phong('#e8608f'), { rz: Math.PI / 2, y: 0.03 });
      break;
    case 'plastic-comb':
      add(new THREE.BoxGeometry(0.6, 0.03, 0.16), phong('#3b8fd6'), { y: 0.02 });
      break;
    case 'pencil-lead':
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 6), phong('#f2b632'), { rz: Math.PI / 2, y: 0.06 });
      add(new THREE.ConeGeometry(0.06, 0.16, 6), phong('#3d3d45', true), { rz: -Math.PI / 2, x: 0.39, y: 0.06 });
      break;
    case 'rubber-eraser':
      add(new THREE.BoxGeometry(0.42, 0.16, 0.24), phong('#f08aa6'), { y: 0.08 });
      add(new THREE.BoxGeometry(0.2, 0.165, 0.245), phong('#5b9bd5'), { x: 0.11, y: 0.08 });
      break;
    case 'rubber-band':
      add(new THREE.TorusGeometry(0.2, 0.025, 6, 28), phong('#c9a26b'), { rx: Math.PI / 2, y: 0.03 });
      break;
    case 'glass-marble':
      add(new THREE.SphereGeometry(0.16, 20, 14), phong('#7cc3e8', true, { transparent: true, opacity: 0.8 }), { y: 0.16 });
      break;
    case 'cotton-thread':
      add(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 16), phong('#e6505a'), { y: 0.16 });
      add(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), phong(WOOD), { y: 0.02 });
      add(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), phong(WOOD), { y: 0.32 });
      break;
    case 'cotton-towel':
    case 'bedsheet':
      add(new THREE.BoxGeometry(0.6, 0.1, 0.42), phong(art === 'bedsheet' ? '#f1ecf9' : '#9fd0e8'), { y: 0.05 });
      break;
    default:
      add(new THREE.BoxGeometry(0.4, 0.2, 0.3), phong('#cccccc'), { y: 0.1 });
  }
  return g;
}

function horseshoe(mats: Mat[]): THREE.Group {
  const g = new THREE.Group();
  const red = phong('#d8433a', true);
  const tip = phong('#e9edf2', true);
  mats.push(red, tip);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 12, 28, Math.PI), red);
  arc.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  arc.position.set(0.35, 0.16, 0);
  g.add(arc);
  for (const z of [-0.42, 0.42]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.28, 0.28), red);
    leg.position.set(0.07, 0.16, z);
    g.add(leg);
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.29, 0.29), tip);
    end.position.set(-0.3, 0.16, z);
    g.add(end);
  }
  return g;
}

interface Anim {
  obj: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  duration: number;
  wobble?: boolean;
  ease: (t: number) => number;
}

export class MagnetBenchScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  private readonly mats: Mat[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly models = new Map<string, THREE.Group>();
  private readonly slots = new Map<string, THREE.Vector3>();
  private readonly opts: BenchOptions;
  private readonly createdAt = performance.now();
  private anims: Anim[] = [];
  private atMagnet: string | null = null;
  private drag: { id: string; pointerId: number; startX: number; startY: number; moved: number } | null = null;
  private raf = 0;
  private dirty = true;
  private ready = false;
  private reducedMotion: boolean;
  private readonly canvas: HTMLCanvasElement;
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25);
  private readonly ray = new THREE.Raycaster();

  constructor(canvas: HTMLCanvasElement, opts: BenchOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.reducedMotion = opts.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(new THREE.HemisphereLight('#fff8ee', '#9a7a5a', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 1.5);
    sun.position.set(-3, 8, 6);
    this.scene.add(sun);

    const wood = phong('#d9a86a');
    const edge = phong('#b9874f');
    this.mats.push(wood, edge);
    const top = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.3, 4.4), wood);
    top.position.y = -0.15;
    const front = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.4, 0.2), edge);
    front.position.set(0, -0.35, 2.2);
    this.geos.push(top.geometry, front.geometry);
    this.scene.add(top, front);
    // The test spot: a soft ring showing where to bring things.
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(TEST_SPOT).setY(0.005);
    this.mats.push(ringMat);
    this.geos.push(ring.geometry);
    this.scene.add(ring);

    const magnet = horseshoe(this.mats);
    magnet.position.set(MAGNET_X, TABLE_TOP, -0.15);
    this.scene.add(magnet);

    this.camera.position.set(0.2, 6.2, 7.0);
    this.camera.lookAt(0.2, -0.1, 0.55);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    this.resize();
    this.loop();
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
  }

  /**
   * Objects still to test sit in a row at the front; the one being tested sits
   * at the magnet. A new test plays its animation once.
   */
  update(row: BenchObject[], atMagnet: { object: BenchObject; pulled: boolean; testKey: string } | null) {
    const wanted = new Set([...row.map((o) => o.id), ...(atMagnet ? [atMagnet.object.id] : [])]);
    for (const [id, model] of this.models) {
      if (!wanted.has(id)) {
        this.scene.remove(model);
        this.models.delete(id);
        this.slots.delete(id);
      }
    }
    const spacing = Math.min(1.15, 6.4 / Math.max(1, row.length));
    row.forEach((o, i) => {
      const slot = new THREE.Vector3(-3.0 + spacing * (i + 0.5), TABLE_TOP, 1.05);
      this.slots.set(o.id, slot);
      const model = this.ensure(o);
      if (!this.drag || this.drag.id !== o.id) model.position.copy(slot);
      model.rotation.set(0, 0, 0);
    });
    const key = atMagnet ? `${atMagnet.object.id}:${atMagnet.testKey}` : null;
    if (atMagnet && key !== this.atMagnet) {
      const model = this.ensure(atMagnet.object);
      const end = atMagnet.pulled ? new THREE.Vector3(POLE_X - 0.38, TABLE_TOP + 0.02, -0.15) : TEST_SPOT.clone();
      const from = model.position.clone();
      if (this.reducedMotion) model.position.copy(end);
      else if (atMagnet.pulled) {
        // Slide to the test spot, then speed into the magnet (an ease-in "snap").
        this.anims.push({ obj: model, from, to: TEST_SPOT.clone(), start: performance.now(), duration: 250, ease: (t) => 1 - (1 - t) * (1 - t) });
        this.anims.push({ obj: model, from: TEST_SPOT.clone(), to: end, start: performance.now() + 330, duration: 300, ease: (t) => t * t * t });
      } else {
        this.anims.push({ obj: model, from, to: end, start: performance.now(), duration: 260, ease: (t) => 1 - (1 - t) * (1 - t) });
        this.anims.push({ obj: model, from: end, to: end, start: performance.now() + 300, duration: 420, wobble: true, ease: (t) => t });
      }
    }
    this.atMagnet = key;
    if (atMagnet) {
      const model = this.models.get(atMagnet.object.id);
      if (model && this.reducedMotion) model.position.copy(atMagnet.pulled ? new THREE.Vector3(POLE_X - 0.38, TABLE_TOP + 0.02, -0.15) : TEST_SPOT);
    }
    this.dirty = true;
  }

  private ensure(o: BenchObject): THREE.Group {
    let model = this.models.get(o.id);
    if (!model) {
      model = objectModel(o.art, this.mats);
      // A little larger than life so small things (clips, pins) are easy to see and grab.
      model.scale.setScalar(1.4);
      model.userData.objectId = o.id;
      model.traverse((c) => {
        if ((c as THREE.Mesh).geometry) this.geos.push((c as THREE.Mesh).geometry);
      });
      this.models.set(o.id, model);
      this.scene.add(model);
    }
    return model;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Narrow screens: widen the view so the whole table stays visible.
    this.camera.fov = w / h < 1.2 ? 46 : 32;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.renderer.dispose();
  }

  // ------------------------------------------------------------ input

  private hitObject(e: PointerEvent): string | null {
    this.ray.setFromCamera(this.ndc(e), this.camera);
    const candidates = [...this.models.values()].filter((m) => this.slots.has(m.userData.objectId as string));
    const hit = this.ray.intersectObjects(candidates, true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.objectId) o = o.parent;
    return (o?.userData.objectId as string | undefined) ?? null;
  }

  private ndc(e: PointerEvent): THREE.Vector2 {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private onDown = (e: PointerEvent) => {
    const id = this.hitObject(e);
    if (!id) return;
    this.drag = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: 0 };
    this.canvas.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.pointerId !== e.pointerId) {
      this.canvas.style.cursor = this.hitObject(e) ? 'grab' : 'default';
      return;
    }
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.startX, e.clientY - d.startY));
    if (d.moved < 6) return;
    this.ray.setFromCamera(this.ndc(e), this.camera);
    const p = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, p)) {
      const model = this.models.get(d.id);
      model?.position.set(THREE.MathUtils.clamp(p.x, -3.6, MAGNET_X - 0.6), TABLE_TOP + 0.25, THREE.MathUtils.clamp(p.z, -1.8, 2));
      this.dirty = true;
    }
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    this.drag = null;
    const model = this.models.get(d.id);
    if (d.moved < 6) {
      this.opts.onTest(d.id);
      return;
    }
    if (model && model.position.distanceTo(new THREE.Vector3(MAGNET_X, TABLE_TOP, -0.15)) < PULL_ZONE + 0.9) {
      this.opts.onTest(d.id);
      return;
    }
    // Dropped away from the magnet: back to its place.
    const slot = this.slots.get(d.id);
    if (model && slot) {
      if (this.reducedMotion) model.position.copy(slot);
      else this.anims.push({ obj: model, from: model.position.clone(), to: slot.clone(), start: performance.now(), duration: 220, ease: (t) => 1 - (1 - t) * (1 - t) });
    }
    this.dirty = true;
  };

  private onCancel = (e: PointerEvent) => {
    if (this.drag?.pointerId !== e.pointerId) return;
    const slot = this.slots.get(this.drag.id);
    this.models.get(this.drag.id)?.position.copy(slot ?? TEST_SPOT);
    this.drag = null;
    this.dirty = true;
  };

  // ------------------------------------------------------------- loop

  private loop = () => {
    const now = performance.now();
    if (this.anims.length) {
      this.anims = this.anims.filter((a) => {
        if (now < a.start) return true;
        const t = Math.min(1, (now - a.start) / a.duration);
        if (a.wobble) {
          a.obj.rotation.y = Math.sin(t * Math.PI * 6) * 0.18 * (1 - t);
        } else {
          a.obj.position.lerpVectors(a.from, a.to, a.ease(t));
          a.obj.position.y = a.to.y + Math.sin(t * Math.PI) * 0.05;
        }
        return t < 1;
      });
      this.dirty = true;
    }
    if (this.dirty && !document.hidden) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
      if (!this.ready) {
        this.ready = true;
        this.opts.onReady?.(Math.round(performance.now() - this.createdAt));
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
