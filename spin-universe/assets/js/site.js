/* Scroll wiring for the SPINiverse front page.
 *
 * The visualisation is loaded after first paint. If WebGL is missing, the
 * module fails to load, or the visitor asks for reduced motion, the page still
 * reads correctly: every panel is simply shown in sequence as it scrolls by.
 */

document.documentElement.classList.add('home-enhanced');

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const stage = document.getElementById('stage');
const panels = Array.from(document.querySelectorAll('.panel')).map((el) => ({
  el,
  from: parseFloat(el.dataset.from),
  to: parseFloat(el.dataset.to),
}));
const stepCounter = document.querySelector('[data-stage-step]');
const panelAnchors = panels.map((panel, index) => (
  index === 0 ? 0 : index === panels.length - 1 ? 1 : (panel.from + panel.to) / 2
));
let panelCenters = [];
let currentStep = -1;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = window.matchMedia('(max-width: 820px)').matches;

let universe = null;
let ticking = false;

function measurePanels() {
  const gap = Math.min(64, Math.max(32, window.innerHeight * 0.06));
  panelCenters = panels.map(() => 0);
  for (let index = 1; index < panels.length; index += 1) {
    panelCenters[index] = panelCenters[index - 1]
      + (panels[index - 1].el.offsetHeight + panels[index].el.offsetHeight) / 2 + gap;
  }
}

function panelOffset(progress) {
  for (let index = 1; index < panelAnchors.length; index += 1) {
    if (progress <= panelAnchors[index]) {
      const t = (progress - panelAnchors[index - 1])
        / (panelAnchors[index] - panelAnchors[index - 1]);
      return panelCenters[index - 1] + t * (panelCenters[index] - panelCenters[index - 1]);
    }
  }
  return panelCenters.at(-1) || 0;
}

function update() {
  ticking = false;
  if (!stage) return;

  const rect = stage.getBoundingClientRect();
  const travel = stage.offsetHeight - window.innerHeight;
  const p = travel > 0 ? clamp01(-rect.top / travel) : 0;

  const offset = panelOffset(p);
  const active = panels.findIndex((panel, index) => (
    index === panels.length - 1 || p < (panel.to + panels[index + 1].from) / 2
  ));
  panels.forEach((panel, index) => {
    const distance = panelCenters[index] - offset;
    const spacing = index === 0
      ? panelCenters[1] || 1 : panelCenters[index] - panelCenters[index - 1];
    const opacity = 0.32 + 0.68 * Math.max(0, 1 - Math.abs(distance) / spacing);
    panel.el.style.setProperty('--panel-offset', `${distance.toFixed(1)}px`);
    panel.el.style.opacity = Math.max(index === active ? 0.9 : 0.32, opacity).toFixed(3);
  });
  if (active !== currentStep) {
    currentStep = active;
    panels.forEach((panel, index) => {
      panel.el.classList.toggle('is-current', index === active);
      if (index === active) panel.el.setAttribute('aria-current', 'step');
      else panel.el.removeAttribute('aria-current');
    });
    if (stepCounter) {
      stepCounter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
      stepCounter.setAttribute('aria-label', `Step ${active + 1} of ${panels.length}`);
    }
  }

  if (universe) {
    universe.setProgress(p);
    // Only draw while the canvas can actually be seen.
    const onscreen = rect.top < window.innerHeight && rect.bottom > 0;
    universe.setVisible(onscreen);
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
  measurePanels();
  requestUpdate();
});
measurePanels();
document.fonts?.ready.then(() => { measurePanels(); requestUpdate(); });
update();

/* Build the contact address only after a deliberate click. This keeps the
   address out of the rendered page while preserving the native mail client. */
for (const link of document.querySelectorAll('[data-email-contact]')) {
  link.addEventListener('click', (event) => {
    const encoded = link.dataset.emailContact;
    if (!encoded) return;

    try {
      const address = window.atob(encoded);
      if (!address.includes('@')) return;
      event.preventDefault();
      window.location.href = `mailto:${address}`;
    } catch (_error) {
      // Leave the in-page fallback untouched if the address cannot be decoded.
    }
  });
}

/* --------------------------------------------------------------- boot viz */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function enableVizDrag(controller) {
  for (const zone of document.querySelectorAll('[data-viz-drag]')) {
    let pointerId = null;
    let lastX = 0;
    let lastY = 0;

    const finish = (event) => {
      if (pointerId === null) return;
      if (event && Number.isFinite(event.pointerId) && event.pointerId !== pointerId) return;
      const capturedId = pointerId;
      pointerId = null;
      zone.classList.remove('is-dragging');
      controller.endDrag();
      if (zone.hasPointerCapture(capturedId)) zone.releasePointerCapture(capturedId);
    };

    zone.addEventListener('pointerdown', (event) => {
      if (pointerId !== null || event.button !== 0 || !event.isPrimary || event.pointerType === 'touch') return;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      zone.setPointerCapture(pointerId);
      zone.classList.add('is-dragging');
      controller.beginDrag();
      event.preventDefault();
    });

    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      controller.dragBy(dx, dy);
      event.preventDefault();
    });

    zone.addEventListener('pointerup', finish);
    zone.addEventListener('pointercancel', finish);
    zone.addEventListener('lostpointercapture', finish);
    window.addEventListener('blur', finish);
    zone.classList.add('is-ready');
  }
}

async function boot() {
  const canvas = document.getElementById('viz');
  if (!canvas || !hasWebGL()) return;
  try {
    const { createUniverse } = await import('./universe.js?v=8');
    universe = createUniverse(canvas, {
      compact,
      reducedMotion,
      background: 0xe8ebec,
      bloom: false,
    });
    universe.start();
    enableVizDrag(universe);
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
