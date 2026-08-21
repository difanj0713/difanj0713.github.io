/* Interactive storytelling for the MINER paper page. */

const SVG_NS = 'http://www.w3.org/2000/svg';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function svgElement(name, attributes = {}, text = '') {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, value);
  }
  if (text) node.textContent = text;
  return node;
}

/* Hero: selected signals from several depths become one vector ------------ */

function initHeroLayers() {
  const root = document.getElementById('minerHeroLayers');
  if (!root) return;

  const signals = [
    [1], [4], [1, 7], [3], [2, 8], [0, 5], [3, 6], [1, 4, 9], [2, 7], [0, 3, 6, 9],
  ];

  signals.forEach((selected, rowIndex) => {
    const row = document.createElement('div');
    row.className = `miner-hero-layer${rowIndex >= 8 ? ' is-late' : ''}`;
    row.dataset.layer = `L${15 + rowIndex * 2}`;
    row.style.setProperty('--shift', `${Math.sin(rowIndex * 0.78) * 7}px`);

    for (let index = 0; index < 10; index += 1) {
      const cell = document.createElement('i');
      if (selected.includes(index)) {
        cell.className = 'is-signal';
        cell.style.setProperty('--delay', `${(rowIndex * 91 + index * 47) % 1100}ms`);
      }
      row.appendChild(cell);
    }
    root.appendChild(row);
  });
}

/* Measured Jina quality / efficiency trade-off --------------------------- */

const tradeoffData = [
  { key: 'dense', label: 'Dense Jina', quality: 53.3, storage: 22.24, qps: 15.41 },
  { key: 'miner', label: 'MINER', quality: 55.2, storage: 22.24, qps: 14.36 },
  { key: 'late', label: 'Late interaction', quality: 57.6, storage: 943.38, qps: 2.75 },
];

function initTradeoffChart() {
  const chart = document.getElementById('minerTradeoffChart');
  const controls = Array.from(document.querySelectorAll('[data-tradeoff]'));
  const controlGroup = document.querySelector('.miner-tradeoff-controls');
  const status = document.getElementById('minerTradeoffStatus');
  if (!chart || !controls.length || !controlGroup || !status) return;

  const compact = window.matchMedia('(max-width: 500px)').matches;
  const width = compact ? 360 : 1060;
  const chartHeight = compact ? 420 : 500;
  const left = compact ? 52 : 104;
  const right = compact ? 338 : 965;
  const top = compact ? 38 : 52;
  const bottom = compact ? 330 : 398;
  const qualityMin = 50;
  const qualityMax = 60;
  let mode = 'storage';

  const qualityY = (value) => bottom - ((value - qualityMin) / (qualityMax - qualityMin)) * (bottom - top);
  const storageX = (value) => {
    const min = Math.log10(10);
    const max = Math.log10(1100);
    return left + ((Math.log10(value) - min) / (max - min)) * (right - left);
  };
  const speedX = (value) => left + (value / 17) * (right - left);

  function draw() {
    chart.replaceChildren();
    chart.setAttribute('viewBox', `0 0 ${width} ${chartHeight}`);
    const title = svgElement('title', { id: 'tradeoffTitle' }, mode === 'storage'
      ? 'Retrieval quality against index size for dense Jina, MINER, and late interaction'
      : 'Retrieval quality against search throughput for dense Jina, MINER, and late interaction');
    const desc = svgElement('desc', { id: 'tradeoffDesc' }, mode === 'storage'
      ? 'MINER improves average nDCG at the same 22.24 megabyte index size as dense Jina. Late interaction scores higher but uses a 943.38 megabyte index.'
      : 'MINER serves 14.36 queries per second compared with 15.41 for dense Jina and 2.75 for late interaction, while improving average nDCG over dense Jina.');
    chart.append(title, desc);

    [50, 52, 54, 56, 58, 60].forEach((tick) => {
      const y = qualityY(tick);
      chart.appendChild(svgElement('line', { x1: left, y1: y, x2: right, y2: y, class: 'tradeoff-grid' }));
      chart.appendChild(svgElement('text', { x: left - 14, y: y + 4, 'text-anchor': 'end', class: 'tradeoff-tick' }, String(tick)));
    });

    chart.appendChild(svgElement('line', { x1: left, y1: bottom, x2: right, y2: bottom, class: 'tradeoff-axis' }));
    chart.appendChild(svgElement('line', { x1: left, y1: top, x2: left, y2: bottom, class: 'tradeoff-axis' }));
    chart.appendChild(svgElement('text', {
      x: 25, y: (top + bottom) / 2, transform: `rotate(-90 25 ${(top + bottom) / 2})`,
      'text-anchor': 'middle', class: 'tradeoff-axis-title',
    }, 'AVERAGE NDCG@5'));

    const ticks = mode === 'storage'
      ? (compact ? [20, 100, 1000] : [20, 50, 100, 250, 500, 1000])
      : (compact ? [0, 8, 16] : [0, 4, 8, 12, 16]);
    ticks.forEach((tick) => {
      const x = mode === 'storage' ? storageX(tick) : speedX(tick);
      chart.appendChild(svgElement('line', { x1: x, y1: bottom, x2: x, y2: bottom + 6, class: 'tradeoff-axis' }));
      chart.appendChild(svgElement('text', { x, y: bottom + 24, 'text-anchor': 'middle', class: 'tradeoff-tick' }, mode === 'storage' ? String(tick) : String(tick)));
    });

    chart.appendChild(svgElement('text', {
      x: (left + right) / 2, y: compact ? 402 : 468, 'text-anchor': 'middle', class: 'tradeoff-axis-title',
    }, mode === 'storage' ? 'INDEX STORAGE (MB, LOG SCALE) · LOWER IS BETTER' : 'QUERY THROUGHPUT (QPS) · HIGHER IS BETTER'));

    const xFor = (datum) => mode === 'storage' ? storageX(datum.storage) : speedX(datum.qps);
    const dense = tradeoffData[0];
    const miner = tradeoffData[1];
    chart.appendChild(svgElement('line', {
      x1: xFor(dense), y1: qualityY(dense.quality), x2: xFor(miner), y2: qualityY(miner.quality), class: 'tradeoff-gain-line',
    }));

    for (const datum of tradeoffData) {
      const x = xFor(datum);
      const y = qualityY(datum.quality);
      const group = svgElement('g', { class: `tradeoff-group tradeoff-${datum.key}` });
      const point = svgElement('circle', {
        cx: x, cy: y, r: datum.key === 'miner' ? 11 : 9,
        class: `tradeoff-point point-${datum.key}`,
      });
      const labelPosition = getLabelPosition(datum.key, mode, x, y);
      const label = svgElement('text', {
        x: labelPosition.x, y: labelPosition.y,
        'text-anchor': labelPosition.anchor, class: 'tradeoff-label',
      }, datum.label);
      const cost = mode === 'storage' ? `${datum.storage.toFixed(2)} MB` : `${datum.qps.toFixed(2)} QPS`;
      const value = svgElement('text', {
        x: labelPosition.x, y: labelPosition.y + 18,
        'text-anchor': labelPosition.anchor, class: 'tradeoff-value',
      }, `${datum.quality.toFixed(1)} nDCG · ${cost}`);
      group.append(point, label, value);
      chart.appendChild(group);
    }

    const minerX = xFor(miner);
    const minerY = qualityY(miner.quality);
    const boxWidth = compact ? (mode === 'storage' ? 172 : 184) : (mode === 'storage' ? 176 : 202);
    const boxX = compact
      ? (mode === 'storage' ? minerX + 25 : minerX - boxWidth - 22)
      : (mode === 'storage' ? minerX + 52 : minerX - 224);
    const boxY = minerY - 14;
    chart.appendChild(svgElement('rect', { x: boxX, y: boxY, width: boxWidth, height: 27, rx: 4, class: 'tradeoff-callout-box' }));
    chart.appendChild(svgElement('text', { x: boxX + boxWidth / 2, y: boxY + 18, 'text-anchor': 'middle', class: 'tradeoff-callout' }, mode === 'storage' ? '+1.9 nDCG pts · +0 MB index' : '93% of dense throughput'));

    controls.forEach((control) => {
      const active = control.dataset.tradeoff === mode;
      control.classList.toggle('is-active', active);
      control.setAttribute('aria-pressed', String(active));
    });
    status.textContent = mode === 'storage'
      ? 'Showing retrieval quality against index size. MINER improves Jina by 1.9 nDCG points with no added index storage.'
      : 'Showing retrieval quality against search speed. MINER retains 93 percent of dense throughput and is 5.3 times faster than late interaction.';
  }

  function getLabelPosition(key, currentMode, x, y) {
    if (currentMode === 'storage') {
      if (key === 'dense') return { x: x + (compact ? 13 : 18), y: y + 30, anchor: 'start' };
      if (key === 'miner') return { x: x + (compact ? 13 : 18), y: y - 22, anchor: 'start' };
      return { x: x - (compact ? 10 : 16), y: y - 20, anchor: 'end' };
    }
    if (key === 'late') return { x: x + (compact ? 11 : 17), y: y - 20, anchor: 'start' };
    if (key === 'dense') return { x: x - (compact ? 11 : 17), y: y + 31, anchor: 'end' };
    return { x: x - (compact ? 11 : 17), y: y - 22, anchor: 'end' };
  }

  controls.forEach((control) => {
    control.addEventListener('click', () => {
      mode = control.dataset.tradeoff;
      draw();
    });
  });

  controlGroup.hidden = false;
  draw();
}

/* Real layer-selection ranges from the paper's 0–35 analysis figures ------ */

const layerRanges = {
  Jina: [12, 13, 15, 22, 28],
  Eager: [10, 12, 19, 21, 22],
  MoCa: [12, 13, 15, 19, 21],
};

const ckaCutoffs = ['0.50', '0.55', '0.60', '0.65', '0.70'];

function initLayerExplorer() {
  const stack = document.getElementById('minerLayerStack');
  const modelControls = Array.from(document.querySelectorAll('[data-backbone]'));
  const modelGroup = document.querySelector('.miner-backbone-switch');
  const cutoffControl = document.querySelector('.miner-cutoff-control');
  const cutoff = document.getElementById('minerCkaCutoff');
  const cutoffValue = document.getElementById('minerCkaValue');
  const range = document.getElementById('minerCandidateRange');
  const count = document.getElementById('minerCandidateCount');
  const realignCount = document.getElementById('minerRealignCount');
  if (!stack || !modelControls.length || !modelGroup || !cutoffControl || !cutoff || !cutoffValue || !range || !count || !realignCount) return;

  let model = 'Jina';
  const layers = [];
  stack.replaceChildren();

  for (let layerIndex = 0; layerIndex < 36; layerIndex += 1) {
    const layer = document.createElement('span');
    layer.className = 'miner-layer';
    layer.dataset.label = `L${layerIndex}`;
    if ([0, 5, 10, 15, 20, 25, 30, 35].includes(layerIndex)) layer.classList.add('has-label');
    layer.style.setProperty('--layer-height', `${28 + ((layerIndex * 17 + 11) % 34)}%`);
    stack.appendChild(layer);
    layers.push(layer);
  }

  function update() {
    const cutoffIndex = Number(cutoff.value);
    const start = layerRanges[model][cutoffIndex];
    const end = 35;
    const baseStart = 33;
    const selectedCount = end - start + 1;
    const alignedCount = Math.max(0, baseStart - start);

    layers.forEach((layer, layerIndex) => {
      const selected = layerIndex >= start;
      const base = layerIndex >= baseStart;
      layer.classList.toggle('is-realign', selected && !base);
      layer.classList.toggle('is-reweight', selected && base);
      layer.style.setProperty('--layer-height', selected
        ? `${48 + ((layerIndex * 19 + cutoffIndex * 7) % 44)}%`
        : `${23 + ((layerIndex * 11 + 5) % 24)}%`);
    });

    cutoffValue.value = `CKA = ${ckaCutoffs[cutoffIndex]}`;
    cutoffValue.textContent = `CKA = ${ckaCutoffs[cutoffIndex]}`;
    range.textContent = `Layers ${start}–${end}`;
    count.textContent = `${selectedCount} of 36 layers selected`;
    realignCount.textContent = `${alignedCount} layer${alignedCount === 1 ? '' : 's'}`;
    stack.setAttribute('aria-label', `${model} layers ${start} through ${end} selected at a CKA cutoff of ${ckaCutoffs[cutoffIndex]}. Layers ${start} through 32 are realigned and layers 33 through 35 are reweighted.`);
    cutoff.setAttribute('aria-valuetext', `CKA cutoff ${ckaCutoffs[cutoffIndex]}, ${model} layers ${start} through ${end} selected`);

    modelControls.forEach((control) => {
      const active = control.dataset.backbone === model;
      control.classList.toggle('is-active', active);
      control.setAttribute('aria-pressed', String(active));
    });
  }

  modelControls.forEach((control) => {
    control.addEventListener('click', () => {
      model = control.dataset.backbone;
      update();
    });
  });
  cutoff.addEventListener('input', update);

  modelGroup.hidden = false;
  cutoffControl.hidden = false;
  update();
}

/* Gentle progressive reveal --------------------------------------------- */

function initReveal() {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!items.length || reducedMotion || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('miner-enhanced');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

  items.forEach((item) => observer.observe(item));
}

const initializers = [
  initHeroLayers,
  initTradeoffChart,
  initLayerExplorer,
  initReveal,
];

for (const initialize of initializers) {
  try {
    initialize();
  } catch (error) {
    console.warn(`[MINER] ${initialize.name} unavailable:`, error);
  }
}
