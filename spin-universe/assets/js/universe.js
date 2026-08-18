/*
 * The SPIN-Universe title visualisation.
 *
 * Adapted from the interactive SPIN demo built by Yilun Liu
 * (github.com/liuyilun2000/spin-visualization) for the ACL 2024 paper.
 *
 * The original is a one-way sequence of timed animations advanced by six
 * button presses. This version is a rebuild in which the entire scene is a
 * pure function of one scalar, `progress`, so it can be driven by scroll
 * position and read correctly in both directions.
 *
 * The activation values are synthetic. This is a diagram of the method, not a
 * readout of a running model.
 */

import * as THREE from 'three';
import { EffectComposer } from 'post/EffectComposer.js';
import { RenderPass } from 'post/RenderPass.js';
import { UnrealBloomPass } from 'post/UnrealBloomPass.js';

/* ------------------------------------------------------------------ helpers */

/** Deterministic PRNG, so the field looks identical on every visit. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Progress of `p` through the window [a, b], clamped to [0, 1]. */
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------- config */

const DESKTOP = { layer: 12, neuron: 16, token: 6 };
const COMPACT = { layer: 9, neuron: 11, token: 5 };

const CUBE_SIZE = 0.64;
const SPACING = { layer: 2, neuron: 1, token: 1.2 };
const FRUSTUM = 37;

/** World height of an axis label. Kept small: they are annotation, not subject. */
const LABEL_HEIGHT = 0.62;

/** Fraction of the viewport width the block is pushed right, to clear the copy. */
const PAN_FRACTION = 0.24;

/* Colours carried over from the original: crimson marks the probing stage,
   indigo marks the integration stage. They are also the site's two accents. */
const PROBE_COLOR = 0xaa1234;
const INTEGRATE_COLOR = 0x3456bb;
const TUBE_COLOR = 0xefeff4;

/** Saliency cut. Matches the original: keeps a little under a third. */
const SALIENCY_CUT = 0.36;

/* Stage boundaries over the scroll progress [0, 1]. Panel copy in index.html
   is keyed to the same numbers. */
const STAGE = {
  poolFade: [0.12, 0.26],
  poolMove: [0.16, 0.32],
  probeIn: [0.33, 0.48],
  sparsify: [0.50, 0.62],
  integrate: [0.64, 0.90],
  settle: [0.90, 1.0],
};

/* --------------------------------------------------------------- text label */

function makeLabelSprite(text, pxSize = 44) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `500 ${pxSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  const h = Math.ceil(pxSize * 1.35);
  canvas.width = w;
  canvas.height = h;
  // Resizing the canvas resets the context, so the font must be set again.
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(text, 4, h / 2);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  // Size from the glyph box, so the drawn height is fixed no matter how long
  // the string is. The original sized from the font size against an untrimmed
  // canvas, which makes the labels dominate the frame.
  sprite.scale.set(LABEL_HEIGHT * (w / h), LABEL_HEIGHT, 1);
  sprite.center.set(0, 0.5);
  return sprite;
}

/* ---------------------------------------------------------------- the scene */

export function createUniverse(canvas, options = {}) {
  const compact = options.compact === true;
  const dims = compact ? COMPACT : DESKTOP;
  const useBloom = options.bloom !== false && !compact;
  const reduced = options.reducedMotion === true;

  const rand = mulberry32(20240711);

  const offset = new THREE.Vector3(dims.neuron * -0.5, dims.layer * -0.4, dims.token * -0.5);
  const gridPos = (i, j, k) =>
    new THREE.Vector3(
      (j + offset.x) * SPACING.neuron,
      (i + offset.y) * SPACING.layer,
      (k + offset.z) * SPACING.token
    );

  /* -- data ------------------------------------------------------------- */

  const activation = [];
  const argmaxToken = [];
  const saliency = [];
  for (let i = 0; i < dims.layer; i++) {
    activation[i] = [];
    argmaxToken[i] = [];
    saliency[i] = [];
    for (let j = 0; j < dims.neuron; j++) {
      activation[i][j] = [];
      let best = -1;
      let bestK = 0;
      for (let k = 0; k < dims.token; k++) {
        const a = rand();
        activation[i][j][k] = a;
        if (a > best) {
          best = a;
          bestK = k;
        }
      }
      argmaxToken[i][j] = bestK;
      saliency[i][j] = rand() * 0.5;
    }
  }

  /* -- renderer --------------------------------------------------------- */

  const scene = new THREE.Scene();

  const aspect0 = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
  const camera = new THREE.OrthographicCamera(
    (-FRUSTUM * aspect0) / 2,
    (FRUSTUM * aspect0) / 2,
    FRUSTUM / 2,
    -FRUSTUM / 2,
    0.5,
    1500
  );

  /* The canvas is opaque and clears to the page background, so the CSS opacity
     fades between sections read as the block dissolving rather than as a panel
     of a different colour sliding away. Bloom over a transparent clear colour
     leaves a grey haze, which is the other reason not to do it. */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !compact, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
  renderer.setClearColor(options.background ?? 0x05070d, 1);

  let composer = null;
  let bloomPass = null;
  if (useBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.8, 0);
    composer.addPass(bloomPass);
  }

  /* -- geometry --------------------------------------------------------- */

  const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

  /* The original ramps hue from red to green. Here the activation field is kept
     cool so that crimson can mean one thing only, the probing stage, and so the
     block sits inside the site's palette instead of beside it. */
  const COLD = new THREE.Color(0x2f3f9e);
  const MID = new THREE.Color(0x6b7dfb);
  const HOT = new THREE.Color(0xe9edff);
  const activationColor = (a) => {
    const c = new THREE.Color();
    return a < 0.72 ? c.copy(COLD).lerp(MID, a / 0.72) : c.copy(MID).lerp(HOT, (a - 0.72) / 0.28);
  };
  /* Bloom is off on small screens, so the peaks need to carry themselves. */
  const activationOpacity = compact ? (a) => 0.05 + Math.pow(a, 5) : (a) => 0.02 + Math.pow(a, 8);

  /** Every cube in the layer x neuron x token block. */
  const cells = [];
  /** The one cube per (layer, neuron) that survives max pooling. */
  const maxCells = [];

  for (let i = 0; i < dims.layer; i++) {
    for (let j = 0; j < dims.neuron; j++) {
      for (let k = 0; k < dims.token; k++) {
        const a = activation[i][j][k];
        const material = new THREE.MeshBasicMaterial({
          color: activationColor(a),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(cubeGeometry, material);
        const home = gridPos(i, j, k);
        mesh.position.copy(home);
        scene.add(mesh);

        const cell = {
          mesh,
          material,
          color: activationColor(a),
          home,
          scatter: new THREE.Vector3(
            (rand() - 0.5) * 90,
            (rand() - 0.5) * 90,
            (rand() - 0.5) * 90
          ),
          a,
          i,
          j,
          k,
          isMax: argmaxToken[i][j] === k,
          salient: saliency[i][j] >= SALIENCY_CUT,
          phase: rand() * Math.PI * 2,
          baseOpacity: activationOpacity(a),
        };
        cells.push(cell);
        if (cell.isMax) maxCells.push(cell);
      }
    }
  }

  /* Column cubes: the probe head (crimson) and the integration head (indigo)
     share one position per layer, off the side of the block. */
  const columnPos = (i) => gridPos(i, dims.neuron / 2 - 1, dims.token * 1.5);
  const probeCubes = [];
  const integrateCubes = [];
  for (let i = 0; i < dims.layer; i++) {
    const p = columnPos(i);
    const pm = new THREE.MeshBasicMaterial({ color: PROBE_COLOR, transparent: true, opacity: 0, depthWrite: false });
    const pc = new THREE.Mesh(cubeGeometry, pm);
    pc.position.copy(p);
    scene.add(pc);
    probeCubes.push({ mesh: pc, material: pm });

    const im = new THREE.MeshBasicMaterial({ color: INTEGRATE_COLOR, transparent: true, opacity: 0, depthWrite: false });
    const ic = new THREE.Mesh(cubeGeometry, im);
    ic.position.copy(p);
    scene.add(ic);
    integrateCubes.push({ mesh: ic, material: im });
  }

  /* -- labels ----------------------------------------------------------- */

  const tokenWords = ['This', 'movie', 'is', 'the', 'best', '!', 'really', '?'];
  const layerSprites = [];
  const neuronSprites = [];
  const tokenSprites = [];

  for (let i = 0; i < dims.layer; i++) {
    const s = makeLabelSprite(`L${i}`, 40);
    s.position.copy(gridPos(i, 0, 0)).add(new THREE.Vector3(-1.5 * SPACING.neuron, 0.25, -1.5 * SPACING.token));
    scene.add(s);
    layerSprites.push(s);
  }
  for (let j = 0; j < (compact ? 0 : dims.neuron); j++) {
    const s = makeLabelSprite(`N${j}`, 40);
    s.position
      .copy(gridPos(0, j, dims.token - 1))
      .add(new THREE.Vector3(0, -0.5 * SPACING.layer, 0.5 * SPACING.token));
    s.material.rotation = -Math.PI / 4;
    scene.add(s);
    neuronSprites.push(s);
  }
  for (let k = 0; k < (compact ? 0 : dims.token); k++) {
    const s = makeLabelSprite(tokenWords[k % tokenWords.length], 40);
    s.position
      .copy(gridPos(0, 0, k))
      .add(new THREE.Vector3(-3 * SPACING.neuron, -0.5 * SPACING.layer, -0.25));
    scene.add(s);
    tokenSprites.push(s);
  }

  /* -- splines ---------------------------------------------------------- */

  /* One tube per (layer, neuron): from the pooled activation to that layer's
     probe head. The start point is fixed once pooling has finished, so the
     only thing that moves is the end point, and it only moves during
     integration. That lets us precompute the geometry at each whole-layer
     step and interpolate the vertex buffers, instead of rebuilding tubes. */

  const TUBULAR = 14;
  const RADIAL = 4;
  const TUBE_RADIUS = 0.032;

  function splinePoints(p1, p2) {
    const pts = [];
    for (let n = 0; n < 4; n++) {
      const f = n / 3;
      const e = easeInOut(f);
      pts.push(new THREE.Vector3(lerp(p1.x, p2.x, e), lerp(p1.y, p2.y, e), lerp(p1.z, p2.z, f)));
    }
    return pts;
  }

  function tubePositions(p1, p2) {
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(splinePoints(p1, p2)), TUBULAR, TUBE_RADIUS, RADIAL, false);
    const arr = Float32Array.from(g.attributes.position.array);
    g.dispose();
    return arr;
  }

  const splines = [];
  for (const cell of maxCells) {
    const i = cell.i;
    const start = cell.home.clone();
    start.z = 0; // pooling collapses the token axis before the tubes appear
    start.z += CUBE_SIZE / 2;
    const end = columnPos(i).clone();
    end.z -= CUBE_SIZE / 2;

    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(splinePoints(start, end)),
      TUBULAR,
      TUBE_RADIUS,
      RADIAL,
      false
    );
    const material = new THREE.MeshBasicMaterial({ color: TUBE_COLOR, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);

    const spline = {
      mesh,
      material,
      geometry,
      cell,
      i,
      salient: cell.salient,
      sal: saliency[i][cell.j],
      states: null,
      lastStep: -1,
    };

    /* Only the surviving tubes ever move, so only they need the stack. */
    if (cell.salient) {
      const steps = dims.layer - 1 - i;
      const states = [Float32Array.from(geometry.attributes.position.array)];
      for (let m = 1; m <= steps; m++) {
        const e2 = end.clone();
        e2.y += m * SPACING.layer;
        states.push(tubePositions(start, e2));
      }
      spline.states = states;
    }

    splines.push(spline);
  }

  /* -- state ------------------------------------------------------------ */

  let progress = 0;
  let intro = reduced ? 1 : 0;
  let introStart = 0;
  let running = false;
  let rafId = 0;
  let clockStart = performance.now();
  let bloomCycle = 0;
  let disposed = false;
  let visible = true;

  const tmpColor = new THREE.Color();
  const black = new THREE.Color(0x000000);

  function applyProgress(p, t) {
    const introEase = easeOut(intro);

    /* --- activation block --- */
    const poolFade = seg(p, STAGE.poolFade[0], STAGE.poolFade[1]);
    const poolMove = easeInOut(seg(p, STAGE.poolMove[0], STAGE.poolMove[1]));
    const sparsify = seg(p, STAGE.sparsify[0], STAGE.sparsify[1]);

    /* A slow shimmer while the block is simply sitting there. */
    const shimmerAmt = 1 - seg(p, 0.02, 0.14);

    for (let n = 0; n < cells.length; n++) {
      const c = cells[n];
      const m = c.material;

      let op = c.baseOpacity;
      if (shimmerAmt > 0 && !reduced) {
        const s = 0.82 + 0.18 * Math.sin(t * 0.6 + c.phase);
        op *= 1 - shimmerAmt * (1 - s);
      }

      if (!c.isMax) {
        const f = 1 - poolFade;
        op *= f;
        if (poolFade > 0) {
          // desaturate toward black as the value is discarded
          m.color.copy(black).lerp(c.color, f);
        }
      } else if (!c.salient) {
        op *= 1 - sparsify;
      }

      op *= introEase;

      if (op <= 0.004) {
        c.mesh.visible = false;
      } else {
        c.mesh.visible = true;
        m.opacity = op;
        if (c.isMax && poolMove > 0) {
          c.mesh.position.z = c.home.z * (1 - poolMove);
        } else if (intro < 1) {
          c.mesh.position.lerpVectors(c.scatter, c.home, easeInOut(intro));
        } else if (!c.isMax) {
          c.mesh.position.copy(c.home);
        }
      }
    }

    /* --- labels --- */
    const labelBase = introEase * 0.5;
    for (let i = 0; i < layerSprites.length; i++) {
      const s = layerSprites[i];
      s.material.opacity = labelBase * (1 - 0.45 * seg(p, 0.3, 0.6));
      s.position.z = lerp(s.userData.z0 ?? (s.userData.z0 = s.position.z), 0, poolMove);
    }
    for (let j = 0; j < neuronSprites.length; j++) {
      const s = neuronSprites[j];
      s.material.opacity = labelBase * (1 - 0.6 * seg(p, 0.3, 0.6));
      s.position.z = lerp(s.userData.z0 ?? (s.userData.z0 = s.position.z), 0, poolMove);
    }
    for (let k = 0; k < tokenSprites.length; k++) {
      const s = tokenSprites[k];
      s.material.opacity = labelBase * (1 - poolMove);
      s.position.z = lerp(s.userData.z0 ?? (s.userData.z0 = s.position.z), 0, poolMove);
    }

    /* --- the collection plane rising through the stack --- */
    const integrateT = easeInOut(seg(p, STAGE.integrate[0], STAGE.integrate[1]));
    const plane = integrateT * (dims.layer - 1);
    const started = p > STAGE.integrate[0];

    /* --- probe and integration heads --- */
    for (let i = 0; i < dims.layer; i++) {
      const stagger = (i / dims.layer) * 0.06;
      const appear = seg(p, STAGE.probeIn[0] + stagger, STAGE.probeIn[0] + stagger + 0.09);
      const retire = seg(p, STAGE.integrate[0], STAGE.integrate[0] + 0.09);
      const pOp = 0.7 * appear * (1 - retire) * introEase;
      probeCubes[i].material.opacity = pOp;
      probeCubes[i].mesh.visible = pOp > 0.004;

      let iOp = 0;
      if (started) {
        const d = plane - i;
        if (d >= -0.15) {
          const rise = clamp01((d + 0.15) / 0.45);
          const decay = clamp01((d - 0.4) / 1.4);
          iOp = lerp(0.9, 0.24, easeOut(decay)) * rise;
          if (i === dims.layer - 1) iOp = Math.max(iOp, 0.9 * rise);
        }
      }
      iOp *= introEase;
      integrateCubes[i].material.opacity = iOp;
      integrateCubes[i].mesh.visible = iOp > 0.004;
    }

    /* --- tubes --- */
    for (let n = 0; n < splines.length; n++) {
      const s = splines[n];
      const stagger = (n / splines.length) * 0.07;
      const appear = seg(p, STAGE.probeIn[0] + stagger, STAGE.probeIn[0] + stagger + 0.1);

      let op;
      if (!s.salient) {
        op = s.sal * appear * (1 - sparsify);
      } else {
        // survivors dim as the field thins, then brighten as they are collected
        const collected = clamp01(plane - s.i);
        op = lerp(s.sal * appear, 0.16, sparsify);
        op = lerp(op, 0.5 - 0.2 * (plane / dims.layer), easeOut(collected));
      }
      op *= introEase;

      if (op <= 0.004) {
        s.mesh.visible = false;
        continue;
      }
      s.mesh.visible = true;
      s.material.opacity = op;

      if (s.states) {
        const u = Math.max(0, Math.min(plane - s.i, s.states.length - 1));
        const m0 = Math.floor(u);
        const frac = u - m0;
        const step = m0 * 1000 + Math.round(frac * 1000);
        if (step !== s.lastStep) {
          s.lastStep = step;
          const a = s.states[m0];
          const b = s.states[Math.min(m0 + 1, s.states.length - 1)];
          const dst = s.geometry.attributes.position.array;
          if (frac === 0 || a === b) {
            dst.set(a);
          } else {
            for (let v = 0; v < dst.length; v++) dst[v] = a[v] + (b[v] - a[v]) * frac;
          }
          s.geometry.attributes.position.needsUpdate = true;
        }
      }
    }
  }

  /* -- camera ----------------------------------------------------------- */

  const CAM_RADIUS = Math.sqrt(20 * 20 + 20 * 20);
  let yaw = Math.atan2(20, -20);
  let pan = 0; // world units, set on resize

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camFwd = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  function updateCamera(dt, p) {
    if (!reduced) yaw += dt * 0.055;
    const t = clamp01(p);
    camPos.set(Math.cos(yaw) * CAM_RADIUS, lerp(20, 25, easeInOut(t)), Math.sin(yaw) * CAM_RADIUS);
    camTarget.set(0, lerp(0, 3.5, t), 0);

    /* Slide camera and target together along the screen-horizontal axis, which
       moves the subject the other way and opens space for the copy. */
    if (pan !== 0) {
      camFwd.subVectors(camTarget, camPos).normalize();
      camRight.crossVectors(camFwd, WORLD_UP).normalize();
      camPos.addScaledVector(camRight, -pan);
      camTarget.addScaledVector(camRight, -pan);
    }

    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  }

  /* -- loop ------------------------------------------------------------- */

  let lastFrame = performance.now();

  function frame() {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    if (!visible) return;

    if (intro < 1) {
      intro = clamp01((now - introStart) / 2200);
    }

    const t = (now - clockStart) / 1000;
    applyProgress(progress, t);
    updateCamera(dt, progress);

    if (bloomPass) {
      bloomCycle += 0.01;
      bloomPass.strength = 0.56 + ((Math.sin(bloomCycle) + 1) / 2) * 0.08;
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const aspect = w / Math.max(h, 1);
    // Narrow screens put the copy over the block, so there is nothing to clear.
    pan = aspect > 1.05 ? FRUSTUM * aspect * PAN_FRACTION : 0;
    camera.left = (-FRUSTUM * aspect) / 2;
    camera.right = (FRUSTUM * aspect) / 2;
    camera.top = FRUSTUM / 2;
    camera.bottom = -FRUSTUM / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
  }

  return {
    start() {
      if (running) return;
      running = true;
      introStart = performance.now();
      clockStart = performance.now();
      lastFrame = performance.now();
      resize();
      frame();
    },
    setProgress(p) {
      progress = clamp01(p);
    },
    setVisible(v) {
      visible = v;
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      scene.traverse((obj) => {
        if (obj.geometry && obj.geometry !== cubeGeometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
      cubeGeometry.dispose();
      renderer.dispose();
    },
  };
}
