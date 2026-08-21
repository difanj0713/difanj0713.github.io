/* Interactive storytelling for the SPIN paper page. No framework, no WebGL. */

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* Hero signal field ------------------------------------------------------- */

function initHeroSignal() {
  const field = document.getElementById('spinHeroSignal');
  if (!field) return;

  const selected = new Set([
    5, 18, 26, 31, 44, 53, 55, 67, 72, 75, 88, 93, 101, 108, 119, 126, 132,
  ]);

  for (let row = 0; row < 10; row += 1) {
    const rowNode = document.createElement('div');
    rowNode.className = 'spin-signal-row';
    rowNode.dataset.label = `L${String(row * 5).padStart(2, '0')}`;
    rowNode.style.setProperty('--row-offset', `${Math.sin(row * 0.72) * 10}px`);

    for (let column = 0; column < 14; column += 1) {
      const index = row * 14 + column;
      const dot = document.createElement('span');
      dot.className = 'spin-signal-dot';
      if (selected.has(index)) {
        dot.classList.add('is-signal');
        dot.style.setProperty('--delay', `${(row * 73 + column * 41) % 1250}ms`);
        dot.style.setProperty('--signal-color', row > 6 ? '#e0455f' : '#7d8dff');
      }
      rowNode.appendChild(dot);
    }
    field.appendChild(rowNode);
  }
}

/* Measured 8 x 3 result explorer ----------------------------------------- */

const resultData = [
  { model: 'DistilBERT', imdb: [86.95, 89.78, 3.25], sst: [81.88, 83.94, 2.52], edos: [65.09, 75.79, 16.44] },
  { model: 'RoBERTa', imdb: [89.67, 93.61, 4.39], sst: [84.06, 90.59, 7.77], edos: [68.81, 73.50, 6.82] },
  { model: 'GPT2', imdb: [87.72, 91.94, 4.81], sst: [85.89, 87.73, 2.14], edos: [68.57, 76.08, 10.95] },
  { model: 'GPT2-M', imdb: [88.59, 93.92, 6.02], sst: [86.12, 90.25, 4.80], edos: [71.17, 75.74, 6.42] },
  { model: 'GPT2-XL', imdb: [91.86, 94.92, 3.33], sst: [90.02, 93.23, 3.57], edos: [72.56, 76.79, 5.83] },
  { model: 'Flan-T5-S', imdb: [84.08, 91.15, 8.41], sst: [77.17, 88.99, 15.32], edos: [59.62, 74.51, 24.97] },
  { model: 'Flan-T5', imdb: [90.01, 94.14, 4.59], sst: [78.26, 92.32, 17.97], edos: [66.64, 78.04, 17.11] },
  { model: 'Flan-T5-XL', imdb: [90.50, 96.12, 6.21], sst: [84.75, 95.64, 12.85], edos: [70.08, 81.48, 16.27] },
];

const resultPanels = [
  { key: 'imdb', label: 'IMDb', metric: 'accuracy', min: 80, max: 100, ticks: [80, 85, 90, 95, 100], sota: 96.21 },
  { key: 'sst', label: 'SST-2', metric: 'accuracy', min: 70, max: 100, ticks: [70, 80, 90, 100], sota: 97.50 },
  { key: 'edos', label: 'EDOS', metric: 'macro-F1', min: 50, max: 85, ticks: [50, 60, 70, 80], sota: 82.35 },
];

function initResultChart() {
  const chart = document.getElementById('spinResultChart');
  const wrap = chart?.closest('.spin-result-chart-wrap');
  const tooltip = document.getElementById('spinChartTooltip');
  if (!chart || !wrap || !tooltip) return;
  chart.querySelector('[data-result-fallback]')?.remove();

  const top = 78;
  const bottom = 392;
  const panelWidth = 316;
  const panelGap = 28;
  const chartLeft = 28;
  const groups = new Map();
  let lockedModel = null;

  const scaleY = (value, panel) => {
    const ratio = (value - panel.min) / (panel.max - panel.min);
    return bottom - ratio * (bottom - top);
  };

  for (const [panelIndex, panel] of resultPanels.entries()) {
    const x0 = chartLeft + panelIndex * (panelWidth + panelGap);
    const baseX = x0 + 108;
    const spinX = x0 + 236;

    chart.appendChild(svgElement('text', { x: x0 + 34, y: 31, class: 'chart-panel-title' }, panel.label));
    chart.appendChild(svgElement('text', { x: x0 + 34, y: 51, class: 'chart-panel-metric' }, panel.metric));

    for (const tick of panel.ticks) {
      const y = scaleY(tick, panel);
      chart.appendChild(svgElement('line', { x1: x0 + 42, y1: y, x2: x0 + 282, y2: y, class: 'chart-grid-line' }));
      chart.appendChild(svgElement('text', { x: x0 + 35, y: y + 3, 'text-anchor': 'end', class: 'chart-tick' }, String(tick)));
    }

    const sotaY = scaleY(panel.sota, panel);
    chart.appendChild(svgElement('line', { x1: x0 + 42, y1: sotaY, x2: x0 + 282, y2: sotaY, class: 'chart-sota-line' }));
    chart.appendChild(svgElement('text', { x: x0 + 280, y: sotaY - 6, 'text-anchor': 'end', class: 'chart-sota-label' }, `SoTA ${panel.sota.toFixed(2)}`));
    chart.appendChild(svgElement('text', { x: baseX, y: 431, 'text-anchor': 'middle', class: 'chart-x-label' }, 'FINAL LAYER'));
    chart.appendChild(svgElement('text', { x: spinX, y: 431, 'text-anchor': 'middle', class: 'chart-x-label' }, 'SPIN'));
  }

  const showTooltip = (event, datum, panel) => {
    const values = datum[panel.key];
    const absolute = values[1] - values[0];
    tooltip.innerHTML = `<b>${datum.model} · ${panel.label}</b><span>${values[0].toFixed(2)} → ${values[1].toFixed(2)}</span><span>+${absolute.toFixed(2)} points · +${values[2].toFixed(2)}% relative</span>`;
    const bounds = wrap.getBoundingClientRect();
    const left = event.clientX - bounds.left + wrap.scrollLeft;
    const topPosition = event.clientY - bounds.top + wrap.scrollTop;
    tooltip.style.left = `${clamp(left, 8, wrap.scrollWidth - 205)}px`;
    tooltip.style.top = `${clamp(topPosition, 48, bounds.height - 48)}px`;
    tooltip.classList.add('is-visible');
  };

  const hideTooltip = () => tooltip.classList.remove('is-visible');

  for (const datum of resultData) {
    const group = svgElement('g', { class: 'chart-model-group', 'data-model': datum.model });
    groups.set(datum.model, group);

    for (const [panelIndex, panel] of resultPanels.entries()) {
      const x0 = chartLeft + panelIndex * (panelWidth + panelGap);
      const baseX = x0 + 108;
      const spinX = x0 + 236;
      const values = datum[panel.key];
      const baseY = scaleY(values[0], panel);
      const spinY = scaleY(values[1], panel);
      const pathData = `M ${baseX} ${baseY} L ${spinX} ${spinY}`;
      const line = svgElement('path', { d: pathData, class: 'chart-model-line' });
      const basePoint = svgElement('circle', { cx: baseX, cy: baseY, r: 4.2, class: 'chart-point chart-point-base' });
      const spinPoint = svgElement('circle', { cx: spinX, cy: spinY, r: 4.8, class: 'chart-point chart-point-spin' });
      const hit = svgElement('path', {
        d: pathData,
        class: 'chart-hit-line',
        tabindex: '0',
        role: 'button',
        'aria-label': `${datum.model} on ${panel.label}: ${values[0].toFixed(2)} final layer to ${values[1].toFixed(2)} with SPIN`,
      });

      const setTemporaryFocus = () => setFocus(datum.model);
      hit.addEventListener('pointerenter', setTemporaryFocus);
      hit.addEventListener('focus', setTemporaryFocus);
      hit.addEventListener('pointermove', (event) => showTooltip(event, datum, panel));
      hit.addEventListener('pointerleave', () => {
        hideTooltip();
        setFocus(lockedModel);
      });
      hit.addEventListener('blur', () => {
        hideTooltip();
        setFocus(lockedModel);
      });
      hit.addEventListener('click', (event) => {
        lockedModel = datum.model;
        setFocus(lockedModel);
        showTooltip(event, datum, panel);
      });
      hit.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          lockedModel = datum.model;
          setFocus(lockedModel);
        }
      });

      group.append(line, basePoint, spinPoint, hit);
    }
    chart.appendChild(group);
  }

  function setFocus(modelName) {
    if (!modelName) {
      chart.classList.remove('has-focus');
      for (const group of groups.values()) group.classList.remove('is-focused');
      return;
    }

    chart.classList.add('has-focus');
    for (const [name, group] of groups.entries()) {
      group.classList.toggle('is-focused', name === modelName);
    }

  }

  for (const line of chart.querySelectorAll('.chart-model-line')) {
    const length = line.getTotalLength();
    line.style.setProperty('--path-length', length);
    line.style.strokeDasharray = length;
  }

  const draw = () => chart.classList.add('is-drawn');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    draw();
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      draw();
      observer.disconnect();
    }, { threshold: 0.24 });
    observer.observe(chart);
  }

  setFocus(lockedModel);
}

/* Final layer / SPIN method comparison ----------------------------------- */

function initReadoutDemo() {
  const svg = document.getElementById('spinReadoutSvg');
  const caption = document.getElementById('spinReadoutCaption');
  const controls = Array.from(document.querySelectorAll('[data-readout-mode]'));
  if (!svg || !caption || !controls.length) return;

  const selectedByLayer = [
    [1], [5], [2], [4], [0, 6], [3], [1, 5], [4], [0, 3], [5], [2, 6], [1, 4],
  ];
  let mode = 'spin';

  function draw() {
    svg.replaceChildren();
    svg.appendChild(svgElement('title', {}, 'Interactive comparison of a final-layer classifier and SPIN'));
    svg.appendChild(svgElement('desc', {}, 'The final-layer baseline uses the terminal hidden state. SPIN selects salient neurons within each layer and concatenates their activations into a cross-layer representation.'));
    const wireLayer = svgElement('g', { class: 'readout-wires' });
    svg.appendChild(wireLayer);

    const input = svgElement('g');
    input.appendChild(svgElement('rect', { x: 22, y: 175, width: 128, height: 116, rx: 7, class: 'readout-node' }));
    input.appendChild(svgElement('text', { x: 86, y: 202, 'text-anchor': 'middle', class: 'readout-small-label' }, 'INPUT'));
    input.appendChild(svgElement('text', { x: 86, y: 232, 'text-anchor': 'middle', class: 'readout-main-label' }, 'This movie'));
    input.appendChild(svgElement('text', { x: 86, y: 258, 'text-anchor': 'middle', class: 'readout-main-label' }, 'is the best!'));
    svg.appendChild(input);

    const startX = 198;
    const stepX = 43;
    const neuronY = [122, 158, 194, 230, 266, 302, 338];
    const integrationX = 735;
    const integrationY = 230;

    svg.appendChild(svgElement('text', { x: startX, y: 70, class: 'readout-small-label' }, 'EARLY'));
    svg.appendChild(svgElement('text', { x: startX + stepX * 5.5, y: 70, 'text-anchor': 'middle', class: 'readout-small-label' }, 'DEPTH'));
    svg.appendChild(svgElement('text', { x: startX + stepX * 11, y: 70, 'text-anchor': 'end', class: 'readout-small-label' }, 'FINAL'));

    svg.appendChild(svgElement('path', {
      d: `M 150 233 C 170 233, 175 230, ${startX - 12} 230 H ${startX + stepX * 11 + 12}`,
      class: 'readout-layer-line',
    }));

    for (let layer = 0; layer < 12; layer += 1) {
      const x = startX + layer * stepX;
      svg.appendChild(svgElement('line', { x1: x, y1: 100, x2: x, y2: 360, class: 'readout-layer-line' }));
      svg.appendChild(svgElement('text', { x, y: 390, 'text-anchor': 'middle', class: 'readout-small-label' }, `L${layer}`));

      for (let neuron = 0; neuron < neuronY.length; neuron += 1) {
        const isSignal = mode === 'base' ? layer === 11 : selectedByLayer[layer].includes(neuron);
        const classes = ['readout-neuron'];
        if (isSignal) classes.push('is-signal');
        if (isSignal && layer > 7) classes.push('is-hot');
        svg.appendChild(svgElement('circle', { cx: x, cy: neuronY[neuron], r: 6, class: classes.join(' ') }));

        if (mode === 'spin' && isSignal) {
          const bend = 640 + (layer % 3) * 14;
          const wire = svgElement('path', {
            d: `M ${x + 7} ${neuronY[neuron]} C ${bend} ${neuronY[neuron]}, ${integrationX - 42} ${integrationY}, ${integrationX - 9} ${integrationY}`,
            class: `readout-wire${layer > 7 ? ' is-hot' : ''}`,
          });
          wireLayer.appendChild(wire);
        }
      }
    }

    if (mode === 'base') {
      wireLayer.appendChild(svgElement('path', {
        d: `M ${startX + stepX * 11 + 9} 230 C 680 230, 700 230, ${integrationX - 9} ${integrationY}`,
        class: 'readout-wire is-hot',
      }));
    }

    const integrate = svgElement('g');
    integrate.appendChild(svgElement('circle', { cx: integrationX, cy: integrationY, r: 16, class: 'readout-node readout-output' }));
    integrate.appendChild(svgElement('text', { x: integrationX, y: 267, 'text-anchor': 'middle', class: 'readout-small-label' }, mode === 'spin' ? 'INTEGRATE' : 'POOL'));
    svg.appendChild(integrate);

    svg.appendChild(svgElement('path', { d: `M ${integrationX + 16} ${integrationY} H 782`, class: 'readout-wire is-hot' }));
    const output = svgElement('g');
    output.appendChild(svgElement('rect', { x: 782, y: 167, width: 103, height: 128, rx: 7, class: 'readout-node readout-output' }));
    output.appendChild(svgElement('text', { x: 833.5, y: 197, 'text-anchor': 'middle', class: 'readout-small-label' }, 'CLASS'));
    output.appendChild(svgElement('text', { x: 833.5, y: 243, 'text-anchor': 'middle', class: 'readout-output-score' }, 'POSITIVE'));
    output.appendChild(svgElement('text', { x: 833.5, y: 271, 'text-anchor': 'middle', class: 'readout-small-label' }, 'ONE SCORE'));
    svg.appendChild(output);

    caption.innerHTML = mode === 'spin'
      ? '<b>Layer-wise probes identify salient neurons.</b> Their selected activations form a cross-layer representation for the classification head.'
      : '<b>The baseline uses the terminal hidden state.</b> Intermediate representations are not included in its classification features.';
  }

  for (const control of controls) {
    control.addEventListener('click', () => {
      mode = control.dataset.readoutMode;
      for (const button of controls) {
        const active = button === control;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
      draw();
    });
  }

  draw();
}

/* What / Which / Where tabs ---------------------------------------------- */

function initWWWtabs() {
  const tablist = document.querySelector('.spin-www-tabs');
  const tabs = Array.from(document.querySelectorAll('[data-www-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-www-panel]'));
  if (!tablist || !tabs.length || !panels.length) return;

  const activate = (name, focus = false) => {
    for (const tab of tabs) {
      const active = tab.dataset.wwwTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.wwwPanel !== name;
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.wwwTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      activate(tabs[next].dataset.wwwTab, true);
    });
  });

  activate('what');
  tablist.hidden = false;
}

/* WHAT: schematic sparse feature selector -------------------------------- */

function initNeuronBudget() {
  const grid = document.getElementById('spinNeuronGrid');
  const range = document.getElementById('spinEta');
  const value = document.getElementById('spinEtaValue');
  const percent = document.getElementById('spinNeuronPercent');
  if (!grid || !range || !value || !percent) return;

  const etaSteps = [
    { eta: '0.0', selected: 0, label: '0%' },
    { eta: '0.1', selected: 1, label: '≈1%' },
    { eta: '0.2', selected: 1, label: '≈1%' },
    { eta: '0.3', selected: 2, label: '≈2%' },
    { eta: '0.4', selected: 3, label: '≈3%' },
    { eta: '0.5', selected: 5, label: '≈5%' },
    { eta: '0.6', selected: 9, label: '≈9%' },
    { eta: '0.7', selected: 15, label: '≈15%' },
    { eta: '0.8', selected: 24, label: '<25%' },
  ];

  const cells = [];
  for (let index = 0; index < 100; index += 1) {
    const cell = document.createElement('span');
    cell.style.setProperty('--signal-color', index % 3 === 0 ? '#e0455f' : '#7d8dff');
    grid.appendChild(cell);
    cells.push(cell);
  }

  const saliencyOrder = Array.from({ length: 100 }, (_, index) => index)
    .sort((a, b) => ((a * 47 + 13) % 101) - ((b * 47 + 13) % 101));

  const update = () => {
    const step = etaSteps[Number(range.value)];
    const selected = new Set(saliencyOrder.slice(0, step.selected));
    cells.forEach((cell, index) => cell.classList.toggle('is-selected', selected.has(index)));
    value.value = `η = ${step.eta}`;
    value.textContent = `η = ${step.eta}`;
    percent.textContent = step.label;
    range.setAttribute('aria-valuetext', `eta ${step.eta}, ${step.label} of neurons selected in this schematic`);
  };

  range.addEventListener('input', update);
  update();
}

/* WHICH: schematic pooling explorer -------------------------------------- */

function initPoolingDemo() {
  const tokenRoot = document.getElementById('spinTokenActivations');
  const vectorRoot = document.getElementById('spinPooledVector');
  const caption = document.getElementById('spinPoolingCaption');
  const controls = Array.from(document.querySelectorAll('[data-pool]'));
  if (!tokenRoot || !vectorRoot || !caption || !controls.length) return;

  const tokens = ['This', 'movie', 'is', 'the', 'best', '!'];
  const activations = [
    [28, 72, 18, 44, 36, 63, 24, 41],
    [52, 36, 78, 31, 66, 22, 49, 58],
    [19, 41, 37, 68, 29, 54, 33, 26],
    [34, 26, 49, 38, 57, 31, 61, 43],
    [82, 59, 66, 87, 74, 71, 56, 91],
    [46, 33, 54, 72, 61, 85, 42, 67],
  ];
  const cards = [];

  tokens.forEach((token, tokenIndex) => {
    const card = document.createElement('div');
    card.className = 'spin-token-card';
    const label = document.createElement('span');
    label.textContent = token;
    const bars = document.createElement('div');
    bars.className = 'spin-token-bars';
    activations[tokenIndex].forEach((activation) => {
      const bar = document.createElement('i');
      bar.style.setProperty('--value', activation);
      bars.appendChild(bar);
    });
    card.append(label, bars);
    tokenRoot.appendChild(card);
    cards.push(card);
  });

  const vectorCells = Array.from({ length: 8 }, () => {
    const cell = document.createElement('span');
    vectorRoot.appendChild(cell);
    return cell;
  });

  function update(mode) {
    let pooled;
    const sourceTokens = new Set();
    if (mode === 'single') {
      pooled = activations.at(-1);
      sourceTokens.add(activations.length - 1);
      caption.textContent = 'Single-token pooling uses the designated token embedding as the sequence representation.';
    } else if (mode === 'avg') {
      pooled = activations[0].map((_, dimension) => (
        activations.reduce((sum, row) => sum + row[dimension], 0) / activations.length
      ));
      activations.forEach((_, index) => sourceTokens.add(index));
      caption.textContent = 'Mean pooling averages each feature across all token positions.';
    } else {
      pooled = activations[0].map((_, dimension) => {
        let maximum = -Infinity;
        let source = 0;
        activations.forEach((row, tokenIndex) => {
          if (row[dimension] > maximum) {
            maximum = row[dimension];
            source = tokenIndex;
          }
        });
        sourceTokens.add(source);
        return maximum;
      });
      caption.textContent = 'Max pooling retains each feature’s largest activation across token positions.';
    }

    cards.forEach((card, index) => {
      card.classList.toggle('is-source', sourceTokens.has(index));
      card.classList.toggle('is-muted', mode !== 'avg' && !sourceTokens.has(index));
    });
    vectorCells.forEach((cell, index) => cell.style.setProperty('--value', pooled[index].toFixed(1)));
    controls.forEach((control) => {
      const active = control.dataset.pool === mode;
      control.classList.toggle('is-active', active);
      control.setAttribute('aria-pressed', String(active));
    });
  }

  controls.forEach((control) => control.addEventListener('click', () => update(control.dataset.pool)));
  update('max');
}

/* WHERE: measured IMDb early-exit results -------------------------------- */

const earlyExitData = {
  DistilBERT: [85.20, 84.73, 87.45, 88.67, 89.78],
  RoBERTa: [87.06, 89.72, 93.13, 93.50, 93.61],
  GPT2: [87.51, 89.00, 91.10, 91.88, 91.94],
  'GPT2-M': [88.52, 91.36, 93.36, 93.92, 93.92],
  'GPT2-XL': [89.66, 93.15, 94.73, 94.92, 94.92],
  'Flan-T5-S': [82.88, 87.74, 90.93, 91.32, 91.32],
  'Flan-T5': [84.58, 92.55, 94.14, 94.14, 94.14],
  'Flan-T5-XL': [89.21, 95.28, 96.12, 96.12, 96.12],
};

function initExitDemo() {
  const chart = document.getElementById('spinExitChart');
  const modelSelect = document.getElementById('spinExitModel');
  const depthRange = document.getElementById('spinExitDepth');
  const depthValue = document.getElementById('spinExitDepthValue');
  const accuracyValue = document.getElementById('spinExitAccuracy');
  const retentionValue = document.getElementById('spinExitRetention');
  if (!chart || !modelSelect || !depthRange || !depthValue || !accuracyValue || !retentionValue) return;

  const depths = [20, 40, 60, 80, 100];

  function draw() {
    const model = modelSelect.value;
    const scores = earlyExitData[model];
    const activeIndex = Number(depthRange.value);
    const left = 58;
    const right = 588;
    const top = 42;
    const bottom = 232;
    const minScore = Math.floor(Math.min(...scores) - 2);
    const maxScore = Math.ceil(Math.max(...scores) + 1);
    const x = (index) => left + index * ((right - left) / (depths.length - 1));
    const y = (score) => bottom - ((score - minScore) / (maxScore - minScore)) * (bottom - top);

    chart.replaceChildren();
    const defs = svgElement('defs');
    const gradient = svgElement('linearGradient', { id: 'exitAreaGradient', x1: '0', x2: '0', y1: '0', y2: '1' });
    gradient.append(svgElement('stop', { offset: '0%', 'stop-color': '#5868d8', 'stop-opacity': '0.24' }));
    gradient.append(svgElement('stop', { offset: '100%', 'stop-color': '#5868d8', 'stop-opacity': '0' }));
    defs.appendChild(gradient);
    chart.appendChild(defs);

    for (let index = 0; index < 4; index += 1) {
      const score = minScore + (index / 3) * (maxScore - minScore);
      const yPos = y(score);
      chart.appendChild(svgElement('line', { x1: left, y1: yPos, x2: right, y2: yPos, class: 'exit-grid' }));
      chart.appendChild(svgElement('text', { x: left - 10, y: yPos + 3, 'text-anchor': 'end', class: 'exit-tick' }, score.toFixed(0)));
    }

    const linePath = scores.map((score, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(score)}`).join(' ');
    const areaPath = `${linePath} L ${x(scores.length - 1)} ${bottom} L ${x(0)} ${bottom} Z`;
    chart.appendChild(svgElement('path', { d: areaPath, class: 'exit-area' }));
    chart.appendChild(svgElement('path', { d: linePath, class: 'exit-line' }));

    scores.forEach((score, index) => {
      chart.appendChild(svgElement('circle', {
        cx: x(index), cy: y(score), r: index === activeIndex ? 8 : 5,
        class: `exit-point${index === activeIndex ? ' is-current' : ''}`,
      }));
      chart.appendChild(svgElement('text', { x: x(index), y: 261, 'text-anchor': 'middle', class: 'exit-label' }, `${depths[index]}%`));
    });

    chart.appendChild(svgElement('text', { x: left, y: 20, class: 'exit-label' }, `${model} · IMDb accuracy`));
    const score = scores[activeIndex];
    const full = scores.at(-1);
    depthValue.value = `${depths[activeIndex]}%`;
    depthValue.textContent = `${depths[activeIndex]}%`;
    accuracyValue.textContent = score.toFixed(2);
    retentionValue.textContent = `${((score / full) * 100).toFixed(1)}%`;
  }

  modelSelect.addEventListener('change', draw);
  depthRange.addEventListener('input', draw);
  draw();
}

/* Gentle, progressive reveal --------------------------------------------- */

function initReveal() {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!items.length || reducedMotion || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('spin-enhanced');
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
  initHeroSignal,
  initResultChart,
  initReadoutDemo,
  initWWWtabs,
  initNeuronBudget,
  initPoolingDemo,
  initExitDemo,
  initReveal,
];

for (const initialize of initializers) {
  try {
    initialize();
  } catch (error) {
    console.warn(`[SPIN] ${initialize.name} unavailable:`, error);
  }
}
