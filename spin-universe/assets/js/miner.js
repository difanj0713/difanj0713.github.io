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
    chart.appendChild(svgElement('text', { x: boxX + boxWidth / 2, y: boxY + 18, 'text-anchor': 'middle', class: 'tradeoff-callout' }, mode === 'storage' ? '+1.9 pts · same index' : '93% of dense throughput'));

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

/* Measured layer similarity and neuron retention ------------------------- */

const layerData = {
  Jina: {
    similarity: [
      0.005, 0.000, 0.085, 0.112, 0.123, 0.095, 0.139, 0.175, 0.333,
      0.327, 0.407, 0.529, 0.588, 0.589, 0.611, 0.603, 0.600, 0.599,
      0.630, 0.624, 0.638, 0.652, 0.650, 0.638, 0.627, 0.639, 0.641,
      0.763, 0.811, 0.806, 0.837, 0.885, 0.918, 0.967, 0.941, 1.000,
    ],
    dimension: 2048,
    selection: {
      15: { p: 0.2501, count: 324 }, 16: { p: 0.2571, count: 333 },
      17: { p: 0.2500, count: 322 }, 18: { p: 0.2609, count: 337 },
      19: { p: 0.2594, count: 328 }, 20: { p: 0.2998, count: 390 },
      21: { p: 0.2799, count: 354 }, 22: { p: 0.3737, count: 504 },
      23: { p: 0.3818, count: 514 }, 24: { p: 0.3961, count: 527 },
      25: { p: 0.3912, count: 510 }, 26: { p: 0.3986, count: 524 },
      27: { p: 0.4690, count: 679 }, 28: { p: 0.6142, count: 1012 },
      29: { p: 0.6553, count: 1112 }, 30: { p: 0.6691, count: 1153 },
      31: { p: 0.7164, count: 1286 }, 32: { p: 0.8528, count: 1636 },
      33: { p: 0.9530, count: 1905 }, 34: { p: 0.7662, count: 957 },
      35: { p: 0.7910, count: 979 }, 36: { p: 1.0000, count: 2048 },
    },
  },
  Eager: {
    similarity: [
      0.00, 0.10, 0.13, 0.24, 0.37, 0.34, 0.39, 0.39, 0.47,
      0.54, 0.54, 0.57, 0.56, 0.54, 0.53, 0.53, 0.54, 0.54,
      0.61, 0.61, 0.66, 0.70, 0.76, 0.85, 0.93, 0.96, 0.96,
      1.00, 1.00, 1.00, 0.99, 0.95, 0.92, 0.78, 0.71, 0.62,
    ],
    dimension: 2560,
    selection: {
      19: { p: 0.2500, count: 592 }, 20: { p: 0.3046, count: 729 },
      21: { p: 0.3545, count: 853 }, 22: { p: 0.3645, count: 879 },
      23: { p: 0.4495, count: 1102 }, 24: { p: 0.6123, count: 1527 },
      25: { p: 0.7036, count: 1772 }, 26: { p: 0.7159, count: 1803 },
      27: { p: 0.7518, count: 1899 }, 28: { p: 0.7509, count: 1898 },
      29: { p: 0.7816, count: 1978 }, 30: { p: 0.8944, count: 2278 },
      31: { p: 0.9110, count: 2323 }, 32: { p: 0.9561, count: 2443 },
      33: { p: 1.0000, count: 2560 }, 34: { p: 0.7522, count: 1744 },
      35: { p: 0.8138, count: 1949 }, 36: { p: 0.9048, count: 2289 },
    },
  },
  MoCa: {
    similarity: [
      0.00, 0.01, 0.12, 0.20, 0.20, 0.17, 0.18, 0.21, 0.32,
      0.34, 0.41, 0.51, 0.57, 0.56, 0.64, 0.63, 0.63, 0.63,
      0.67, 0.66, 0.70, 0.70, 0.71, 0.78, 0.81, 0.79, 0.80,
      0.92, 0.95, 0.97, 0.99, 1.00, 0.96, 0.83, 0.86, 0.83,
    ],
    dimension: null,
    selection: null,
  },
};

/* The paper selects the suffix beginning at the first qualifying layer. */
const candidateStarts = {
  Jina: [12, 13, 15, 22, 28],
  Eager: [10, 12, 19, 21, 22],
  MoCa: [12, 13, 15, 19, 21],
};

const ckaCutoffs = [0.50, 0.55, 0.60, 0.65, 0.70];

function initLayerExplorer() {
  const stack = document.getElementById('minerLayerStack');
  const modelControls = Array.from(document.querySelectorAll('[data-backbone]'));
  const modelGroup = document.querySelector('.miner-backbone-switch');
  const cutoffControl = document.querySelector('.miner-cutoff-control');
  const cutoff = document.getElementById('minerCkaCutoff');
  const cutoffValue = document.getElementById('minerCkaValue');
  const range = document.getElementById('minerCandidateRange');
  const count = document.getElementById('minerCandidateCount');
  const fact = document.getElementById('minerCkaFact');
  const neuronKey = document.getElementById('minerNeuronKey');
  if (!stack || !modelControls.length || !modelGroup || !cutoffControl || !cutoff || !cutoffValue || !range || !count || !fact || !neuronKey) return;

  let model = 'Jina';
  const layers = [];
  stack.replaceChildren();

  for (let layerNumber = 1; layerNumber <= 36; layerNumber += 1) {
    const column = document.createElement('span');
    const bar = document.createElement('span');
    const marker = document.createElement('i');
    column.className = 'miner-layer-column';
    column.dataset.label = `L${layerNumber}`;
    if ([1, 6, 12, 18, 24, 30, 36].includes(layerNumber)) column.classList.add('has-label');
    bar.className = 'miner-layer';
    marker.className = 'miner-neuron-marker';
    marker.hidden = true;
    column.append(bar, marker);
    stack.appendChild(column);
    layers.push({ column, bar, marker, layerNumber });
  }

  function update() {
    const cutoffIndex = Number(cutoff.value);
    const cutoffScore = ckaCutoffs[cutoffIndex];
    const profile = layerData[model];
    const start = candidateStarts[model][cutoffIndex];
    const end = 36;
    const baseStart = 34;
    const selectedCount = end - start + 1;

    layers.forEach(({ column, bar, marker, layerNumber }, layerIndex) => {
      const similarity = profile.similarity[layerIndex];
      const selected = layerNumber >= start;
      const base = layerNumber >= baseStart;
      const retained = profile.selection?.[layerNumber];

      bar.classList.toggle('is-realign', selected && !base);
      bar.classList.toggle('is-reweight', selected && base);
      bar.style.setProperty('--layer-height', `${Math.max(1.5, similarity * 100)}%`);

      if (selected && retained) {
        const retainedShare = retained.count / profile.dimension;
        column.style.setProperty('--neuron-bottom', `${retainedShare * 100}%`);
        marker.hidden = false;
      } else {
        marker.hidden = true;
      }

      const stage = selected ? (base ? 'BaseProbe candidate' : 'NormProbe candidate') : 'below cutoff';
      const retentionDetail = retained
        ? ` ${retained.count.toLocaleString()} of ${profile.dimension.toLocaleString()} neurons retained (${(retained.count / profile.dimension * 100).toFixed(1)}%; P_l=${retained.p.toFixed(4)}).`
        : '';
      column.title = `${model} layer ${layerNumber}: normalized CKA ${similarity.toFixed(3)}; ${stage}.${retentionDetail}`;
    });

    const cutoffLabel = cutoffScore.toFixed(2);
    cutoffValue.value = `CKA = ${cutoffLabel}`;
    cutoffValue.textContent = `CKA = ${cutoffLabel}`;
    range.textContent = `Layers ${start}–${end}`;
    count.textContent = `${selectedCount} of 36 layers selected at CKA = ${cutoffLabel}`;
    neuronKey.hidden = !profile.selection;
    fact.textContent = profile.selection
      ? `Markers show the measured share of ${profile.dimension.toLocaleString()} neurons retained by ${model} at the default cutoff.`
      : `Bar heights show ${model}'s measured normalized CKA across all 36 layers.`;
    stack.setAttribute('aria-label', `${model} measured normalized CKA by layer. Layers ${start} through ${end} are selected at a cutoff of ${cutoffLabel}; layers ${start} through 33 use NormProbe and layers 34 through 36 use BaseProbe.`);
    cutoff.setAttribute('aria-valuetext', `CKA cutoff ${cutoffLabel}; ${model} layers ${start} through ${end} selected`);

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
