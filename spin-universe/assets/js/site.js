/* Scroll wiring for the SPIN-Universe front page.
 *
 * The visualisation is loaded after first paint. If WebGL is missing, the
 * module fails to load, or the visitor asks for reduced motion, the page still
 * reads correctly: every panel is simply shown in sequence as it scrolls by.
 */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const stage = document.getElementById('stage');
const panels = Array.from(document.querySelectorAll('.panel')).map((el) => ({
  el,
  from: parseFloat(el.dataset.from),
  to: parseFloat(el.dataset.to),
}));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = window.matchMedia('(max-width: 820px)').matches;

let universe = null;
let ticking = false;

function panelOpacity(p, from, to) {
  const fade = 0.035;
  if (p < from - fade || p > to + fade) return 0;
  const rise = clamp01((p - (from - fade)) / fade);
  const fall = 1 - clamp01((p - to) / fade);
  return Math.min(rise, fall);
}

function update() {
  ticking = false;
  if (!stage) return;

  const rect = stage.getBoundingClientRect();
  const travel = stage.offsetHeight - window.innerHeight;
  const p = travel > 0 ? clamp01(-rect.top / travel) : 0;

  for (const panel of panels) {
    const o = panelOpacity(p, panel.from, panel.to);
    panel.el.style.opacity = o.toFixed(3);
    panel.el.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
  }

  if (universe) {
    universe.setProgress(p);
    // Only draw while the canvas can actually be seen.
    const onscreen = rect.top < window.innerHeight && rect.bottom > 0;
    const heroOnscreen = window.scrollY < window.innerHeight * 1.2;
    universe.setVisible(onscreen || heroOnscreen);
  }
}

function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
}

window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', () => {
  if (universe) universe.resize();
  requestUpdate();
});
update();

/* --------------------------------------------------------------- boot viz */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

async function boot() {
  const canvas = document.getElementById('viz');
  if (!canvas || !hasWebGL()) return;
  try {
    const { createUniverse } = await import('./universe.js');
    universe = createUniverse(canvas, {
      compact,
      reducedMotion,
      background: 0x05070d,
    });
    universe.start();
    canvas.classList.add('is-ready');
    update();
  } catch (err) {
    // A page that reads fine without the animation is the fallback.
    console.warn('[spin-universe] visualisation unavailable:', err);
  }
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(boot, { timeout: 1200 });
} else {
  window.addEventListener('load', () => setTimeout(boot, 60));
}
