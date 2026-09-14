/* Research overview figure for the SPINiverse front page.
 *
 * One frozen model, four kinds of input. The SPINiverse view selects a few
 * task-relevant neurons across the layers and combines them into each
 * project's output. Each LLM generation step traverses the layers, then
 * predicts a token from the final-layer representation.
 * Without this module the section keeps its caption and a text fallback.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

/* Below this board width the figure is drawn top to bottom. */
const COMPACT_BELOW = 720;

/* One input and one output per project: SPIN, SIREN, MINER, Agent-SIREN. */
const DOMAINS = [
  { input: 'Review', icon: 'text', caption: 'Class', output: { kind: 'label', value: 'Positive' } },
  { input: 'Prompt', icon: 'chat', caption: 'Harm score', output: { kind: 'score', value: '0.87' } },
  { input: 'Page image', icon: 'page', caption: 'Embedding', output: { kind: 'vector', value: [0.55, 1, 0.3, 0.8, 0.45, 0.9] } },
  { input: 'Agent trace', icon: 'agent', caption: 'Tool use', output: { kind: 'flag', value: 'Unsafe' } },
];

/* Stroke icons on a 24-unit grid. */
const ICONS = {
  text: 'M3.5 6.5h17M3.5 12h17M3.5 17.5h10',
  chat: 'M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8.5L6 20v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z',
  page: 'M6 2.5h8.5L19 7v14.5H6ZM14.5 2.5V7H19M9.5 18v-3M12.5 18v-6M15.5 18v-4',
  agent: 'M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V6A1.5 1.5 0 0 1 4 4.5ZM7 9.5l3 2.5-3 2.5M12 15h5',
};

const LAYER_COUNT = 7;
const NEURON_COUNT = 4;
/* Schematic selection: a few neurons in the intermediate layers. */
const SELECTED = [[], [3], [0], [2], [1, 3], [0], []];
const TOKENS = ['The', 'answer', 'is', '…'];
const TOKEN_GAP = 8;

/* Both schematics illustrate one forward pass, not measured latency.
 * The LLM's token reveal and SPIN's combined outputs finish together. */
const FORWARD = { start: 60, step: 100, pulse: 160 };
const FIRST_PASS_END = FORWARD.start + LAYER_COUNT * FORWARD.step;
const OUTPUT_END = FIRST_PASS_END + 490;
const TOKEN_TIMES = TOKENS.map((_, index) => {
  const first = FIRST_PASS_END + 30;
  const last = OUTPUT_END - 140;
  return first + index * (last - first) / (TOKENS.length - 1);
});
const TITLES = {
  spin: 'SPINiverse: combining signals across layers',
  llm: 'LLM generation: predicting tokens from the final layer',
};
const DESCRIPTIONS = {
  spin: 'A review, a prompt, a page image, and an agent trace pass through every model layer. Selected signals remain available along the way and are combined into a class label, a harm score, an embedding, or an unsafe tool-use flag.',
  llm: "The illustrated forward pass computes through layers. The final-layer representation supplies the readout for next-token prediction.",
};

function svgElement(name, attributes = {}, text = '') {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, value);
  }
  if (text) node.textContent = text;
  return node;
}

function addText(parent, x, y, className, value, anchor = 'start') {
  const node = svgElement('text', { x, y, class: className, 'text-anchor': anchor }, value);
  parent.appendChild(node);
  return node;
}

function addLine(parent, x1, y1, x2, y2, className) {
  parent.appendChild(svgElement('line', { x1, y1, x2, y2, class: className }));
}

function addIcon(parent, kind, x, y, size) {
  const group = svgElement('g', {
    class: 'ov-icon',
    transform: `translate(${x} ${y}) scale(${size / 24})`,
  });
  group.appendChild(svgElement('path', { d: ICONS[kind] }));
  parent.appendChild(group);
}

/* Draws one project output with its right edge at `right`, centred on `y`. */
function addOutput(parent, output, right, y, scale) {
  if (output.kind === 'label' || output.kind === 'score') {
    const className = output.kind === 'score' ? 'ov-out-value ov-out-score' : 'ov-out-value';
    addText(parent, right, y + 7 * scale, className, output.value, 'end');
    return;
  }

  if (output.kind === 'vector') {
    const barWidth = 7 * scale;
    const gap = 4 * scale;
    const maxHeight = 24 * scale;
    const baseline = y + 12 * scale;
    const total = output.value.length * barWidth + (output.value.length - 1) * gap;
    output.value.forEach((value, index) => {
      const height = Math.max(4, value * maxHeight);
      parent.appendChild(svgElement('rect', {
        x: right - total + index * (barWidth + gap),
        y: baseline - height,
        width: barWidth,
        height,
        rx: 1,
        class: 'ov-vector-bar',
      }));
    });
    return;
  }

  const width = 86 * scale;
  const height = 30 * scale;
  parent.appendChild(svgElement('rect', {
    x: right - width, y: y - height / 2, width, height, rx: 4, class: 'ov-flag',
  }));
  addText(parent, right - width / 2, y + 5 * scale, 'ov-flag-text', output.value, 'middle');
}

function addOutputRow(parent, index, captionX, right, y, scale) {
  const row = svgElement('g', { class: 'ov-out-row' });
  addText(row, captionX, y + 5 * scale, 'ov-out-caption', DOMAINS[index].caption);
  addOutput(row, DOMAINS[index].output, right, y, scale);
  parent.appendChild(row);
}

function tokenWidths(charWidth, height) {
  return TOKENS.map((token) => Math.max(height - 4, 28 + token.length * charWidth));
}

/* Decoded tokens, drawn left to right in generation order. */
function addTokens(parent, startX, y, charWidth, height) {
  let x = startX;
  tokenWidths(charWidth, height).forEach((width, index) => {
    const token = svgElement('g', { class: 'ov-token' });
    token.style.setProperty('--at', `${TOKEN_TIMES[index]}ms`);
    token.appendChild(svgElement('rect', { x, y: y - height / 2, width, height, rx: 5 }));
    token.appendChild(svgElement('text', { x: x + width / 2, y: y + 6, 'text-anchor': 'middle' }, TOKENS[index]));
    parent.appendChild(token);
    x += width + TOKEN_GAP;
  });
}

function tokensTotal(charWidth, height) {
  const widths = tokenWidths(charWidth, height);
  return widths.reduce((sum, width) => sum + width, 0) + TOKEN_GAP * (widths.length - 1);
}

/* Base layers stay visible throughout. A brief overlay advances through
 * ALL layers; selected SPIN neurons remain red after it passes, while
 * processed LLM layers keep a subtle blue tint. */
function addLayer(svg, attributes, layer, mode) {
  const isFinal = mode === 'llm' && layer === LAYER_COUNT - 1;
  const rect = svgElement('rect', {
    ...attributes, rx: 3,
    class: isFinal ? 'ov-layer is-final' : `ov-layer${mode === 'llm' ? ' is-computed' : ''}`,
  });
  rect.style.setProperty('--at', `${FORWARD.start + layer * FORWARD.step}ms`);
  svg.appendChild(rect);
  const { start, step, pulse } = FORWARD;
  const sweep = svgElement('rect', { ...attributes, rx: 3, class: 'ov-layer-sweep' });
  sweep.style.setProperty('--at', `${start + layer * step}ms`);
  sweep.style.setProperty('--span', `${pulse}ms`);
  svg.appendChild(sweep);
}

function addNeuron(svg, attributes, layer, selected, mode) {
  const readout = mode === 'llm' && layer === LAYER_COUNT - 1;
  const circle = svgElement('circle', {
    ...attributes, class: `ov-neuron${selected ? ' is-selected' : ''}${readout ? ' is-readout' : mode === 'llm' ? ' is-computed' : ''}`,
  });
  circle.style.setProperty('--at', `${FORWARD.start + layer * FORWARD.step + 35}ms`);
  svg.appendChild(circle);
}

function addSelectedWire(wires, d) {
  wires.appendChild(svgElement('path', { d, class: 'ov-wire', pathLength: 1 }));
}

/* Wide layout: input, model, and output from left to right --------------- */

function drawWide(svg, mode) {
  // Move the drawing down inside its existing frame, using bottom whitespace.
  const top = mode === 'spin' ? 52 : 22;
  const boxHeight = 174;
  const cy = top + boxHeight / 2;
  const rows = DOMAINS.map((_, index) => cy + (index - 1.5) * 40);
  const input = { x: 16, w: 216 };
  const output = { x: 776, w: 208 };
  const firstX = 322;
  const stepX = 50;
  const lastX = firstX + stepX * (LAYER_COUNT - 1);
  const half = 14;
  const node = { x: 736, r: 17 };
  const labelY = top - 22;

  svg.setAttribute('viewBox', `0 0 1000 ${top + boxHeight + 12}`);
  const wires = svgElement('g');
  svg.appendChild(wires);

  if (mode === 'spin') {
    addText(svg, input.x, labelY, 'ov-label', 'INPUT');
    addText(svg, firstX - half, labelY, 'ov-label', 'EARLY');
    addText(svg, (firstX + lastX) / 2, labelY, 'ov-label', 'FROZEN MODEL', 'middle');
    addText(svg, lastX + half, labelY, 'ov-label', 'FINAL', 'end');
    addText(svg, output.x + output.w, labelY, 'ov-label', 'OUTPUT', 'end');
  }

  svg.appendChild(svgElement('rect', {
    x: input.x, y: top, width: input.w, height: boxHeight, rx: 6, class: 'ov-box',
  }));
  DOMAINS.forEach((domain, index) => {
    const y = rows[index];
    if (index) addLine(svg, input.x + 16, y - 20, input.x + input.w - 16, y - 20, 'ov-divider');
    addIcon(svg, domain.icon, input.x + 20, y - 13, 26);
    addText(svg, input.x + 60, y + 6, 'ov-in-label', domain.input);
  });

  wires.appendChild(svgElement('path', {
    d: `M ${input.x + input.w} ${cy} H ${lastX + half}`, class: 'ov-flow',
  }));

  for (let layer = 0; layer < LAYER_COUNT; layer += 1) {
    const x = firstX + layer * stepX;
    addLayer(svg, { x: x - half, y: top, width: half * 2, height: boxHeight }, layer, mode);

    rows.forEach((y, neuron) => {
      const selected = mode === 'spin' && SELECTED[layer].includes(neuron);
      addNeuron(svg, { cx: x, cy: y, r: 7.5 }, layer, selected, mode);
      if (!selected) return;
      const bend = 664 + (layer % 3) * 8;
      addSelectedWire(wires,
        `M ${x + 8} ${y} C ${bend} ${y}, ${node.x - 34} ${cy}, ${node.x - node.r} ${cy}`);
    });
  }

  if (mode === 'spin') {
    svg.appendChild(svgElement('circle', { cx: node.x, cy, r: node.r, class: 'ov-node' }));
    wires.appendChild(svgElement('path', {
      d: `M ${node.x + node.r} ${cy} H ${output.x}`, class: 'ov-wire ov-wire-out', pathLength: 1,
    }));
    svg.appendChild(svgElement('rect', {
      x: output.x, y: top, width: output.w, height: boxHeight, rx: 6, class: 'ov-out-box',
    }));
    rows.forEach((y, index) => {
      if (index) addLine(svg, output.x + 16, y - 20, output.x + output.w - 16, y - 20, 'ov-divider ov-out-divider');
      addOutputRow(svg, index, output.x + 18, output.x + output.w - 18, y, 1);
    });
    return;
  }

  const tokenStart = node.x - node.r;
  wires.appendChild(svgElement('path', {
    d: `M ${lastX + half} ${cy} H ${tokenStart}`, class: 'ov-flow ov-llm-flow', pathLength: 1,
  }));
  addTokens(svg, tokenStart, cy, 10.2, 50);
}

/* Compact layout: the same figure drawn from top to bottom --------------- */

function drawCompact(svg, mode) {
  const cx = 180;
  const input = { x: 12, y: 28, w: 336, h: 108 };
  const output = { x: 12, y: 394, w: 336, h: 108 };
  const columns = [28, 192];
  const cellRows = (box) => [box.y + 33, box.y + 77];
  const firstY = 168;
  const stepY = 24;
  const lastY = firstY + stepY * (LAYER_COUNT - 1);
  const halfWidth = 116;
  const halfHeight = 9;
  const neuronX = Array.from({ length: NEURON_COUNT }, (_, index) => cx + (index - 1.5) * 52);
  const node = { y: 360, r: 14 };
  const modelLabelX = cx - halfWidth - 20;
  const modelLabelY = (firstY + lastY) / 2;

  svg.setAttribute('viewBox', '0 0 360 514');
  const wires = svgElement('g');
  svg.appendChild(wires);

  if (mode === 'spin') {
    addText(svg, input.x, input.y - 12, 'ov-label', 'INPUT');
    addText(svg, cx + halfWidth + 10, firstY + 5, 'ov-label', 'EARLY');
    addText(svg, cx + halfWidth + 10, lastY + 5, 'ov-label', 'FINAL');
    addText(svg, modelLabelX, modelLabelY, 'ov-label', 'FROZEN MODEL', 'middle')
      .setAttribute('transform', `rotate(-90 ${modelLabelX} ${modelLabelY})`);
  }

  const addGrid = (box, className) => {
    svg.appendChild(svgElement('rect', {
      x: box.x, y: box.y, width: box.w, height: box.h, rx: 6, class: className,
    }));
    const dividerClass = className === 'ov-out-box' ? 'ov-divider ov-out-divider' : 'ov-divider';
    addLine(svg, box.x + 14, box.y + box.h / 2, box.x + box.w - 14, box.y + box.h / 2, dividerClass);
    addLine(svg, cx, box.y + 12, cx, box.y + box.h - 12, dividerClass);
  };

  addGrid(input, 'ov-box');
  DOMAINS.forEach((domain, index) => {
    const x = columns[index % 2];
    const y = cellRows(input)[Math.floor(index / 2)];
    addIcon(svg, domain.icon, x, y - 11, 22);
    addText(svg, x + 31, y + 6, 'ov-in-label', domain.input);
  });

  wires.appendChild(svgElement('path', {
    d: `M ${cx} ${input.y + input.h} V ${lastY + halfHeight}`, class: 'ov-flow',
  }));

  for (let layer = 0; layer < LAYER_COUNT; layer += 1) {
    const y = firstY + layer * stepY;
    addLayer(svg, {
      x: cx - halfWidth, y: y - halfHeight, width: halfWidth * 2, height: halfHeight * 2,
    }, layer, mode);

    neuronX.forEach((x, neuron) => {
      const selected = mode === 'spin' && SELECTED[layer].includes(neuron);
      addNeuron(svg, { cx: x, cy: y, r: 6 }, layer, selected, mode);
      if (!selected) return;
      const bend = lastY + 22 + (layer % 3) * 6;
      addSelectedWire(wires,
        `M ${x} ${y + 7} C ${x} ${bend}, ${cx} ${node.y - 34}, ${cx} ${node.y - node.r}`);
    });
  }

  if (mode === 'spin') {
    addText(svg, output.x, output.y - 12, 'ov-label', 'OUTPUT');
    svg.appendChild(svgElement('circle', { cx, cy: node.y, r: node.r, class: 'ov-node' }));
    wires.appendChild(svgElement('path', {
      d: `M ${cx} ${node.y + node.r} V ${output.y}`, class: 'ov-wire ov-wire-out', pathLength: 1,
    }));
    addGrid(output, 'ov-out-box');
    DOMAINS.forEach((_, index) => {
      const x = columns[index % 2];
      addOutputRow(svg, index, x, x + 142, cellRows(output)[Math.floor(index / 2)], 0.82);
    });
    return;
  }

  const tokenY = output.y + output.h / 2;
  const tokenHeight = 44;
  const tokenStart = cx - tokensTotal(9.6, tokenHeight) / 2;
  wires.appendChild(svgElement('path', {
    d: `M ${cx} ${lastY + halfHeight} V ${tokenY - tokenHeight / 2}`, class: 'ov-flow ov-llm-flow', pathLength: 1,
  }));
  addTokens(svg, tokenStart, tokenY, 9.6, tokenHeight);
}

/* Controller ------------------------------------------------------------- */

function initOverview() {
  const demo = document.querySelector('.overview-demo');
  const replay = demo?.querySelector('.overview-replay');
  if (!demo || !replay) return;

  const panels = Array.from(demo.querySelectorAll('.overview-comparison')).map((panel) => {
    const svg = panel.querySelector('.overview-svg');
    const board = panel.querySelector('.overview-board');
    return { svg, board, mode: panel.dataset.overviewMode, compact: board.clientWidth < COMPACT_BELOW, played: false };
  });

  function updateType({ svg, compact }) {
    const scale = svg.getBoundingClientRect().width / 1000;
    const factor = compact || !scale ? 1 : Math.min(1.12, Math.max(1, 0.94 / scale));
    svg.style.setProperty('--ov-type', factor.toFixed(3));
  }

  function draw(panel, animate, armed = false) {
    const { svg, board, mode, compact } = panel;
    svg.replaceChildren(
      svgElement('title', { id: `${svg.id}Title` }, TITLES[mode]),
      svgElement('desc', { id: `${svg.id}Desc` }, DESCRIPTIONS[mode]),
    );
    svg.style.setProperty('--ov-forward-end', `${FIRST_PASS_END}ms`);
    svg.classList.toggle('is-compact', compact);
    board.classList.toggle('is-compact', compact);
    svg.classList.toggle('is-animated', animate && !motionPreference.matches);
    svg.classList.toggle('is-armed', armed && !motionPreference.matches);
    (compact ? drawCompact : drawWide)(svg, mode);
    updateType(panel);
  }

  let observer;
  function play(panel) {
    panel.played = true;
    panel.svg.classList.remove('is-armed');
    observer?.unobserve(panel.svg);
  }

  replay.addEventListener('click', () => {
    // A phone cannot show both rows at once. Return to the first row and
    // let each replay begin in view, just as on the initial visit.
    const fits = demo.getBoundingClientRect().height < window.innerHeight - 100;
    demo.scrollIntoView({ block: fits ? 'center' : 'start', behavior: 'instant' });
    panels.forEach((panel) => {
      panel.played = false;
      draw(panel, true, true);
      observer?.unobserve(panel.svg);
      observer?.observe(panel.svg);
    });
  });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => {
      panels.forEach((panel) => {
        const compact = panel.board.clientWidth < COMPACT_BELOW;
        if (compact === panel.compact) {
          updateType(panel);
          return;
        }
        panel.compact = compact;
        // Resizing a completed figure keeps its complete state. An unseen
        // figure remains ready to play when it enters the viewport.
        const awaitingEntry = !panel.played && Boolean(observer) && !motionPreference.matches;
        draw(panel, awaitingEntry, awaitingEntry);
      });
    });
    panels.forEach(({ board }) => resizeObserver.observe(board));
  }

  function setupMotion() {
    observer?.disconnect();
    const animate = !motionPreference.matches && 'IntersectionObserver' in window;
    replay.hidden = !animate;
    panels.forEach((panel) => {
      draw(panel, animate && !panel.played, animate && !panel.played);
    });
    if (!animate) return;

    // Both visible rows begin together. On a short or narrow screen each
    // row waits for its own entrance so its animation is never missed.
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.4) return;
        const panel = panels.find(({ svg }) => svg === entry.target);
        if (panel && !panel.played) play(panel);
      });
    }, { threshold: 0.4 });
    panels.filter((panel) => !panel.played).forEach(({ svg }) => observer.observe(svg));
  }

  motionPreference.addEventListener('change', setupMotion);
  setupMotion();
}

try {
  initOverview();
} catch (error) {
  console.warn('[SPINiverse] overview figure unavailable:', error);
}
