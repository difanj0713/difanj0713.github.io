/* Interactive storytelling for the SIREN paper page. No framework. */

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

/* Hero safety field ------------------------------------------------------- */

function initHeroLayers() {
  const root = document.getElementById('sirenHeroLayers');
  if (!root) return;

  const safetyByLayer = [
    [], [7], [2], [1, 6], [3, 8], [0, 5], [2, 7], [1, 4, 8], [3, 6], [2], [7], [],
  ];

  for (let layerIndex = 0; layerIndex < safetyByLayer.length; layerIndex += 1) {
    const layer = document.createElement('div');
    layer.className = 'siren-hero-layer';
    const rise = Math.sin((Math.PI * layerIndex) / (safetyByLayer.length - 1)) * 4;
    layer.style.setProperty('--layer-rise', `${rise.toFixed(2)}rem`);

    for (let neuronIndex = 0; neuronIndex < 9; neuronIndex += 1) {
      const neuron = document.createElement('span');
      if (safetyByLayer[layerIndex].includes(neuronIndex)) {
        neuron.classList.add('is-safety');
        neuron.style.setProperty('--delay', `${(layerIndex * 91 + neuronIndex * 67) % 1500}ms`);
        neuron.style.setProperty('--signal-color', layerIndex < 5 ? '#7d8dff' : '#e0455f');
      }
      layer.appendChild(neuron);
    }
    root.appendChild(layer);
  }
}

/* Measured matched-backbone result chart --------------------------------- */

const resultData = [
  { model: 'Qwen3', size: '0.6B', guard: 81.7, siren: 85.6 },
  { model: 'Llama3.2', size: '1B', guard: 70.7, siren: 85.7 },
  { model: 'Qwen3', size: '4B', guard: 83.4, siren: 86.7 },
  { model: 'Llama3.1', size: '8B', guard: 77.0, siren: 86.3 },
];

function initResultChart() {
  const chart = document.getElementById('sirenResultChart');
  if (!chart) return;
  chart.querySelector('[data-result-fallback]')?.remove();

  const compact = window.matchMedia('(max-width: 760px)').matches;
  const chartWidth = compact ? 360 : 1000;
  const chartHeight = compact ? 390 : 410;
  const left = compact ? 112 : 270;
  const right = compact ? 292 : 875;
  const top = compact ? 60 : 70;
  const bottom = compact ? 370 : 370;
  const minimum = 65;
  const maximum = 90;
  const rowY = compact ? [95, 180, 265, 350] : [105, 185, 265, 345];
  const x = (value) => left + ((value - minimum) / (maximum - minimum)) * (right - left);

  chart.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
  chart.classList.toggle('is-compact', compact);
  chart.parentElement.classList.toggle('is-compact', compact);

  const tickValues = compact ? [65, 75, 85, 90] : [65, 70, 75, 80, 85, 90];
  tickValues.forEach((tick) => {
    const xPos = x(tick);
    chart.appendChild(svgElement('line', {
      x1: xPos, y1: top, x2: xPos, y2: bottom, class: 'result-grid',
    }));
    chart.appendChild(svgElement('text', {
      x: xPos, y: compact ? 44 : 48, 'text-anchor': 'middle', class: 'result-tick',
    }, String(tick)));
  });

  chart.appendChild(svgElement('text', {
    x: left, y: 23, class: 'result-axis-label',
  }, 'AVERAGE MACRO-F1'));
  chart.appendChild(svgElement('text', {
    x: compact ? 352 : 965, y: 23, 'text-anchor': 'end', class: 'result-axis-label',
  }, 'GAIN'));

  resultData.forEach((datum, index) => {
    const y = rowY[index];
    const guardX = x(datum.guard);
    const sirenX = x(datum.siren);
    const gain = datum.siren - datum.guard;

    chart.appendChild(svgElement('text', {
      x: compact ? 8 : 20, y: y - 4, class: 'result-model',
    }, datum.model));
    chart.appendChild(svgElement('text', {
      x: compact ? 8 : 20, y: y + 16, class: 'result-size',
    }, compact ? `${datum.size} backbone` : `${datum.size} matched backbone`));

    const line = svgElement('line', {
      x1: guardX, y1: y, x2: sirenX, y2: y, class: 'result-link',
    });
    chart.appendChild(line);
    chart.appendChild(svgElement('path', {
      d: `M ${sirenX - 15} ${y - 6} L ${sirenX - 5} ${y} L ${sirenX - 15} ${y + 6}`,
      class: 'result-arrow',
    }));
    chart.appendChild(svgElement('circle', {
      cx: guardX, cy: y, r: 6, class: 'result-guard',
    }));
    chart.appendChild(svgElement('circle', {
      cx: sirenX, cy: y, r: 7, class: 'result-siren',
    }));
    chart.appendChild(svgElement('text', {
      x: guardX - (compact ? 7 : 12), y: y + 4, 'text-anchor': 'end', class: 'result-value-guard',
    }, datum.guard.toFixed(1)));
    chart.appendChild(svgElement('text', {
      x: sirenX + (compact ? 7 : 12), y: y + 4, class: 'result-value-siren',
    }, datum.siren.toFixed(1)));
    chart.appendChild(svgElement('text', {
      x: compact ? 352 : 965, y: y + 4, 'text-anchor': 'end', class: 'result-gain',
    }, `+${gain.toFixed(1)}`));

    const length = Math.abs(sirenX - guardX);
    line.style.setProperty('--path-length', length);
    line.style.strokeDasharray = length;
  });

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
}

/* Generative guard / SIREN comparison ----------------------------------- */

function initReadoutDemo() {
  const svg = document.getElementById('sirenReadoutSvg');
  const controls = Array.from(document.querySelectorAll('[data-safety-mode]'));
  if (!svg || !controls.length) return;

  const selectedByLayer = [
    [], [4], [1], [3], [0, 4], [2], [1, 3], [0, 4], [2], [1], [],
  ];
  let mode = 'siren';

  function addText(x, y, className, value, anchor = 'start') {
    svg.appendChild(svgElement('text', {
      x, y, class: className, 'text-anchor': anchor,
    }, value));
  }

  function draw() {
    svg.replaceChildren();
    svg.appendChild(svgElement('title', { id: 'sirenReadoutTitle' }, 'Interactive comparison of a generative guard and SIREN'));
    svg.appendChild(svgElement('desc', { id: 'sirenReadoutDesc' }, 'A generative guard decodes a safety verdict from its final layer. SIREN selects safety signals across a frozen model and combines them into a continuous score.'));

    const wires = svgElement('g');
    svg.appendChild(wires);

    svg.appendChild(svgElement('rect', {
      x: 20, y: 172, width: 158, height: 136, rx: 7, class: 'readout-box',
    }));
    addText(99, 229, 'readout-main', 'Prompt or', 'middle');
    addText(99, 257, 'readout-main', 'response', 'middle');

    const startX = 232;
    const stepX = 43;
    const layerY = 105;
    const layerHeight = 270;
    const neuronY = [140, 190, 240, 290, 340];
    const lastX = startX + stepX * (selectedByLayer.length - 1);

    wires.appendChild(svgElement('path', {
      d: `M 178 240 H ${startX - 12} M ${startX + 12} 240 H ${lastX + 12}`,
      class: 'readout-flow',
    }));

    addText(startX, 72, 'readout-small', 'EARLY');
    addText((startX + lastX) / 2, 72, 'readout-small', 'FROZEN MODEL', 'middle');
    addText(lastX, 72, 'readout-small', 'FINAL', 'end');

    selectedByLayer.forEach((selected, layerIndex) => {
      const x = startX + layerIndex * stepX;
      const layerClass = mode === 'guard' && layerIndex === selectedByLayer.length - 1
        ? 'readout-layer readout-final'
        : 'readout-layer';
      svg.appendChild(svgElement('rect', {
        x: x - 11, y: layerY, width: 22, height: layerHeight, rx: 3, class: layerClass,
      }));

      neuronY.forEach((y, neuronIndex) => {
        const isSafety = mode === 'siren' && selected.includes(neuronIndex);
        svg.appendChild(svgElement('circle', {
          cx: x, cy: y, r: 5.5,
          class: `readout-neuron${isSafety ? ' is-safety' : ''}`,
        }));

        if (isSafety) {
          const bend = 720 + ((layerIndex % 3) * 9);
          wires.appendChild(svgElement('path', {
            d: `M ${x + 6} ${y} C ${bend} ${y}, 730 240, 757 240`,
            class: 'readout-wire',
          }));
        }
      });
    });

    if (mode === 'siren') {
      svg.appendChild(svgElement('circle', {
        cx: 773, cy: 240, r: 16, class: 'readout-score',
      }));
      wires.appendChild(svgElement('path', {
        d: 'M 789 240 H 820', class: 'readout-wire',
      }));
      svg.appendChild(svgElement('rect', {
        x: 820, y: 165, width: 140, height: 150, rx: 7, class: 'readout-score',
      }));
      addText(890, 247, 'readout-score-text', '0.87', 'middle');
    } else {
      wires.appendChild(svgElement('path', {
        d: `M ${lastX + 12} 240 H 715`, class: 'readout-flow',
      }));
      const tokens = [
        { label: 'Safety', width: 58 },
        { label: ':', width: 34 },
        { label: 'Unsafe', width: 62 },
        { label: '</s>', width: 46 },
      ];
      let tokenX = 715;
      tokens.forEach((token, tokenIndex) => {
        svg.appendChild(svgElement('rect', {
          x: tokenX, y: 211, width: token.width, height: 58, rx: 5, class: 'readout-token',
        }));
        addText(tokenX + token.width / 2, 244, 'readout-token-text', token.label, 'middle');
        if (tokenIndex < tokens.length - 1) {
          wires.appendChild(svgElement('path', {
            d: `M ${tokenX + token.width} 240 H ${tokenX + token.width + 8}`,
            class: 'readout-flow',
          }));
        }
        tokenX += token.width + 8;
      });
    }
  }

  controls.forEach((control) => {
    control.addEventListener('click', () => {
      mode = control.dataset.safetyMode;
      controls.forEach((button) => {
        const active = button === control;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      draw();
    });
  });

  draw();
}

/* Zero-shot streaming schematic ------------------------------------------ */

function initStreamingDemo() {
  const textRoot = document.getElementById('sirenStreamText');
  const range = document.getElementById('sirenPrefixRange');
  const prefixValue = document.getElementById('sirenPrefixValue');
  const scoreValue = document.getElementById('sirenStreamScore');
  const scoreFill = document.getElementById('sirenScoreFill');
  const status = document.getElementById('sirenStreamStatus');
  const scorePanel = scoreValue?.closest('.siren-score-panel');
  const tokens = Array.from(textRoot?.querySelectorAll('span') ?? []);
  if (!textRoot || !range || !prefixValue || !scoreValue || !scoreFill || !status || !scorePanel || !tokens.length) return;

  const scores = [0.06, 0.08, 0.09, 0.11, 0.12, 0.14, 0.18, 0.38, 0.62, 0.58, 0.67, 0.84, 0.91];
  range.hidden = false;

  function update() {
    const count = Number(range.value);
    const score = scores[count - 1];
    const flagged = score >= 0.5;

    tokens.forEach((token, index) => {
      token.classList.toggle('is-future', index >= count);
      token.classList.toggle('is-current', index === count - 1);
    });
    textRoot.classList.toggle('is-flagged', flagged);
    scorePanel.classList.toggle('is-safe', !flagged);
    prefixValue.value = `${count} / ${tokens.length} tokens`;
    prefixValue.textContent = `${count} / ${tokens.length} tokens`;
    scoreValue.textContent = score.toFixed(2);
    scoreFill.style.width = `${score * 100}%`;
    status.textContent = flagged
      ? 'Harmful signal detected in the current prefix.'
      : 'Current prefix remains below the flag threshold.';
    range.setAttribute('aria-valuetext', `${count} of ${tokens.length} tokens received, illustrative harmfulness score ${score.toFixed(2)}`);
  }

  range.addEventListener('input', update);
  update();
}

/* Gentle, progressive reveal --------------------------------------------- */

function initReveal() {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!items.length || reducedMotion || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('siren-enhanced');
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
  initResultChart,
  initReadoutDemo,
  initStreamingDemo,
  initReveal,
];

for (const initialize of initializers) {
  try {
    initialize();
  } catch (error) {
    console.warn(`[SIREN] ${initialize.name} unavailable:`, error);
  }
}
