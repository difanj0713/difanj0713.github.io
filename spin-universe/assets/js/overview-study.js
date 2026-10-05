/* Research overview: the original Slack GIF timeline, played once with replay. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

/* Below this board width the figure is drawn top to bottom. */
const COMPACT_BELOW = 720;

/* One input and one output per project: SPIN, SIREN, MINER, TACIT. */
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

/* Both views share an initial forward pass. LLM decoding then continues;
 * SPIN holds its completed outputs. Timings are schematic, not measured. */
const FORWARD = { start: 60, step: 100, pulse: 160 };
const FIRST_PASS_END = FORWARD.start + LAYER_COUNT * FORWARD.step;
const OUTPUT_END = FIRST_PASS_END + 490;
// First token follows prefill; two subsequent tokens follow cached decoding.
// Timing is schematic, not a latency or FLOP ratio.
const DECODE_STARTS = [1210, 2030];
const TOKEN_TIMES = [830, 1910, 2730, 2950];
const TITLES = {
  spin: 'Readout: combining signals across layers',
  llm: 'LLM generation: predicting tokens from the final layer',
};
const DESCRIPTIONS = {
  spin: 'A review, a prompt, a page image, and an agent trace pass through every model layer. Selected signals remain available along the way and are combined into a class label, a harm score, an embedding, or an unsafe tool-use flag.',
  llm: 'An initial pass processes the input. Each subsequent token is computed through the layers using cached keys and values, then predicted from the final layer. The n× Autoregressive caption indicates repeated forward passes during sequential generation, not a measured cost ratio.',
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
    addText(svg, (firstX + lastX) / 2, labelY, 'ov-label', 'MODEL LAYERS', 'middle');
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
    addText(svg, modelLabelX, modelLabelY, 'ov-label', 'MODEL LAYERS', 'middle')
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


// The combined view marks trainable parameter regions using solid fills.
// The same swatches identify trainable parameters in both model rows.
function marker(svg, name, color) {
  let defs = svg.querySelector('defs');
  if (!defs) { defs = svgElement('defs'); svg.prepend(defs); }
  const id = `${svg.id}-${name}`;
  const m = svgElement('marker', { id, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 5, markerHeight: 5, orient: 'auto' });
  m.append(svgElement('path', { d: 'M1 1L7 4L1 7', fill: 'none', stroke: color, 'stroke-width': 1.3 }));
  defs.append(m);
  return `url(#${id})`;
}

function passage(svg, mode, compact) {
  const spin = mode === 'spin';
  const color = spin ? '#983b4f' : '#667db7';
  const arrow = marker(svg, 'forward', color);
  if (spin) {
    // A single directed track ends in a stop/check; the LLM has a return loop.
    const g = svgElement('g', { class: 'study-single', style: `--study-color:${color}` });
    if (compact) {
      svg.querySelectorAll('.ov-label').forEach(n => { if (n.textContent === 'MODEL LAYERS') n.remove(); });
      g.append(svgElement('path', { d: 'M40 166V323', class: 'study-pass-line', 'marker-end': arrow }));
      g.append(svgElement('circle', { cx: 40, cy: 151, r: 12, class: 'study-count' }));
      addText(g,40,155,'study-count-text','1×','middle');
      addText(g,21,242,'study-pass-caption','forward pass','middle').setAttribute('transform','rotate(-90 21 242)');
      g.append(svgElement('path', { d: 'M35 337l4 4 7-8', class: 'study-check' }));
    } else {
      const y = 248;
      g.append(svgElement('path', { d: `M336 ${y}H705`, class: 'study-pass-line', 'marker-end': arrow }));
      g.append(svgElement('circle', { cx: 319, cy: y, r: 12, class: 'study-count' }));
      addText(g,319,y+4,'study-count-text','1×','middle');
      g.append(svgElement('rect', { x: 443, y: y-10, width: 130, height: 20, fill:'#fff' }));
      addText(g,508,y+4,'study-pass-caption','forward pass','middle');
      g.append(svgElement('path', { d: `M721 ${y}l4 4 8-9`, class: 'study-check' }));
      svg.setAttribute('viewBox','0 0 1000 271');
    }
    svg.append(g);
    return;
  }
  const d = compact
    ? 'M303 470H326Q338 470 338 458V154Q338 142 326 142H180V158'
    : 'M846 142V207Q846 221 832 221H286Q272 221 272 207V123Q272 109 286 109H306';
  svg.append(svgElement('path', { d, class:'study-loop', 'marker-end':arrow }));
  const count = svgElement('g', { class:'study-llm-count', style:`--study-color:${color}` });
  const countX = compact ? 342 : 319;
  const countY = compact ? 170 : 242;
  count.append(svgElement('circle', { cx:countX, cy:countY, r:12, class:'study-count' }));
  addText(count,countX,countY+4,'study-count-text','n×','middle');
  svg.append(count);
  if (compact) {
    addText(svg,342,288,'study-auto-caption','Autoregressive','middle').setAttribute('transform','rotate(90 342 288)');
  } else {
    addText(svg,552,246,'study-auto-caption','Autoregressive','middle');
    svg.setAttribute('viewBox','0 0 1000 266');
  }
  DECODE_STARTS.forEach(at => {
    const p=svgElement('path',{d,pathLength:1,class:'study-loop-pulse'});
    p.style.setProperty('--at',`${at-320}ms`);svg.append(p);
  });
  const sweeps=[...svg.querySelectorAll('.ov-layer-sweep')];
  DECODE_STARTS.forEach(at=>sweeps.forEach((sweep,i)=>{
    const repeat=sweep.cloneNode(true); repeat.style.setProperty('--at',`${at+i*100}ms`);
    svg.insertBefore(repeat,sweep.nextSibling);
  }));
}

// One attached swatch has the same meaning in both rows: a trainable
// parameter at that readout location. It never replaces an activation circle.
function attachParameterSwatch(svg,neuron,mode,compact) {
  const cx=Number(neuron.getAttribute('cx')),cy=Number(neuron.getAttribute('cy'));
  const radius=Number(neuron.getAttribute('r'));
  const x=cx+(compact?11:17),size=8;
  const group=svgElement('g',{
    class:`study-parameter-tag study-parameter-tag-${mode}`,
    'data-neuron-x':cx,'data-neuron-y':cy,
  });
  group.style.setProperty('--at',neuron.style.getPropertyValue('--at'));
  group.append(svgElement('line',{
    x1:cx+radius+1,y1:cy,x2:x,y2:cy,class:'study-tag-link',
  }));
  group.append(svgElement('rect',{
    x,y:cy-size/2,width:size,height:size,rx:1.2,
    class:mode==='spin'?'study-trainable-probe':'study-trainable-weight',
  }));
  svg.append(group);
}

function markTrainableParameters(svg,mode,compact) {
  if(mode==='spin') {
    // No selected activation means no marker on that layer. Each selected
    // activation carries its own readout-parameter swatch, including layers
    // with more than one selected activation.
    svg.querySelectorAll('.ov-neuron.is-selected').forEach(neuron=>{
      attachParameterSwatch(svg,neuron,mode,compact);
    });
    svg.querySelector('.ov-node').classList.add('study-trainable-readout');
    if(compact) svg.querySelectorAll('.ov-label').forEach(n=>{
      if(n.textContent==='EARLY'||n.textContent==='FINAL') n.remove();
    });
    return;
  }
  svg.querySelectorAll('.ov-layer').forEach(n=>n.classList.add('study-trainable-layer'));
  // The matching swatch appears at every displayed position in the full-SFT
  // model; a faint single enclosure includes the backbone and output head.
  svg.querySelectorAll('.ov-neuron').forEach(neuron=>{
    attachParameterSwatch(svg,neuron,mode,compact);
  });
  const head=svgElement('circle',{
    cx:compact?180:687,cy:compact?360:109,r:9,
    class:'study-trainable-lm-head',
  });
  svg.append(head);
  const bounds=[...svg.querySelectorAll('.ov-layer,.study-parameter-tag,.study-trainable-lm-head')].map(n=>n.getBBox());
  const left=Math.min(...bounds.map(b=>b.x))-10;
  const top=Math.min(...bounds.map(b=>b.y))-10;
  const right=Math.max(...bounds.map(b=>b.x+b.width))+10;
  const bottom=Math.max(...bounds.map(b=>b.y+b.height))+10;
  const region=svgElement('rect',{
    x:left,y:top,width:right-left,height:bottom-top,rx:5,
    class:'study-trainable-region',
  });
  // Keep the enclosing region behind the model and its computation paths.
  const firstDrawing=[...svg.children].find(n=>!['title','desc','defs'].includes(n.localName));
  svg.insertBefore(region,firstDrawing);
}

function initStudy(demo) {
  const replay=demo.querySelector('.study-replay');
  const panels=[...demo.querySelectorAll('.overview-comparison')].map(panel=>({
    svg:panel.querySelector('.overview-svg'),board:panel.querySelector('.overview-board'),
    mode:panel.dataset.overviewMode,played:false,compact:null,
  }));
  let observer;
  const hasMotion=()=>!motionPreference.matches&&'IntersectionObserver' in window;
  function draw(panel,animate,armed){
    const {svg,mode}=panel;
    panel.compact=panel.board.clientWidth<COMPACT_BELOW;
    const compact=panel.compact;
    const desc=DESCRIPTIONS[mode]+(mode==='spin'
      ?' Each selected dark red activation has an adjacent pale red square marking its trainable readout coefficient. Unselected activations have no square. The backbone stays frozen; the pale red aggregation head is trainable. These squares depict selected readout parameters, not an exhaustive inventory of parameters used during probe fitting.'
      :' Every displayed activation has an adjacent pale blue parameter square. One pale blue enclosure spans the whole backbone and output head, showing that the entire model is trainable in the full-model fine-tuning comparison. Animation timing and colored areas are schematic, not measured cost or parameter ratios.');
    svg.replaceChildren(svgElement('title',{id:`${svg.id}Title`},TITLES[mode]),svgElement('desc',{id:`${svg.id}Desc`},desc));
    svg.classList.toggle('is-compact',compact);panel.board.classList.toggle('is-compact',compact);
    svg.classList.toggle('is-animated',animate);svg.classList.toggle('is-armed',armed);
    svg.style.setProperty('--ov-forward-end',`${FIRST_PASS_END}ms`);
    (compact?drawCompact:drawWide)(svg,mode);
    passage(svg,mode,compact);
    markTrainableParameters(svg,mode,compact);
  }
  function setup(reset=false){
    observer?.disconnect();
    const motion=hasMotion();replay.hidden=!motion;
    if(motion) observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting||entry.intersectionRatio<.35)return;
      const p=panels.find(p=>p.svg===entry.target);
      const ready=p.compact?[p]:panels;
      ready.forEach(panel=>{
        panel.played=true;panel.svg.classList.remove('is-armed');observer.unobserve(panel.svg);
      });
    }),{threshold:.35});
    panels.forEach(p=>{
      if(reset)p.played=false;
      draw(p,motion&&!p.played,motion&&!p.played);
      if(motion&&!p.played)observer.observe(p.svg);
    });
  }
  replay.addEventListener('click',()=>{
    const fits=demo.getBoundingClientRect().height<innerHeight-110;
    demo.scrollIntoView({block:fits?'center':'start',behavior:'instant'});setup(true);
  });
  new ResizeObserver(()=>panels.forEach(p=>{
    if(p.compact!==(p.board.clientWidth<COMPACT_BELOW))draw(p,hasMotion()&&!p.played,hasMotion()&&!p.played);
  })).observe(demo);
  motionPreference.addEventListener('change',()=>setup());setup();
}
document.querySelectorAll('.cost-study-demo').forEach(initStudy);
