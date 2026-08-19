(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svgElement(name, attributes = {}, textContent = '') {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    if (textContent) element.textContent = textContent;
    return element;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  /* Hero layers --------------------------------------------------------- */

  function initHeroLayers() {
    const root = document.getElementById('agentHeroLayers');
    if (!root) return;

    const signal = [8, 11, 15, 22, 34, 48, 66, 82, 94, 89, 77, 58, 43, 30, 22, 16, 11, 8];
    signal.forEach((strength, index) => {
      const layer = document.createElement('span');
      layer.style.setProperty('--index', index);
      layer.style.setProperty('--signal', strength);
      layer.style.setProperty('--rise', Math.round(strength * 0.45));
      root.appendChild(layer);
    });
  }

  /* Same action, different context ------------------------------------- */

  function initContextDemo() {
    const controls = Array.from(document.querySelectorAll('[data-context]'));
    const card = document.getElementById('agentSchemaCard');
    const state = document.getElementById('agentSchemaState');
    const code = document.getElementById('agentSchemaCode');
    const verdict = document.getElementById('agentContextVerdict');
    const thesis = document.getElementById('agentContextThesis');
    if (!controls.length || !card || !state || !code || !verdict || !thesis) return;
    controls[0].parentElement.hidden = false;

    const views = {
      clear: {
        state: 'clear',
        verdict: 'BENIGN',
        code: '<code><b>authenticate_twitter</b>(<br>&nbsp;&nbsp;username: string,<br>&nbsp;&nbsp;password: string<br>)</code><p><span>username</span> Public account name</p><p><span>password</span> Secret credential</p>',
        thesis: 'The interface names the public and secret fields. The action is consistent with it.',
      },
      ambiguous: {
        state: 'ambiguous',
        verdict: 'UNSAFE',
        code: '<code><b>authenticate_twitter</b>(<br>&nbsp;&nbsp;u: string,<br>&nbsp;&nbsp;p: string<br>)</code><p><span>u</span> No description</p><p><span>p</span> No description</p>',
        thesis: 'The same action now sends a secret through an unnamed slot. Nothing in the interface separates public from private.',
      },
    };

    const update = (name) => {
      const view = views[name];
      if (!view) return;
      card.classList.toggle('is-unsafe', name === 'ambiguous');
      state.textContent = view.state;
      verdict.textContent = view.verdict;
      code.innerHTML = view.code;
      thesis.textContent = view.thesis;
      controls.forEach((control) => {
        const active = control.dataset.context === name;
        control.classList.toggle('is-active', active);
        control.setAttribute('aria-pressed', String(active));
      });
    };

    controls.forEach((control) => control.addEventListener('click', () => update(control.dataset.context)));
    update('clear');
  }

  /* Output versus internal signal -------------------------------------- */

  function initSignalDemo() {
    const controls = Array.from(document.querySelectorAll('[data-signal-system]'));
    const headline = document.getElementById('agentSignalHeadline');
    const body = document.getElementById('agentSignalBody');
    const outputRow = document.querySelector('[data-signal-row="output"]');
    const outputValue = document.getElementById('agentOutputValue');
    const outputBar = document.getElementById('agentOutputBar');
    const outputNote = document.getElementById('agentOutputNote');
    const internalValue = document.getElementById('agentInternalValue');
    const internalBar = document.getElementById('agentInternalBar');
    const internalNote = document.getElementById('agentInternalNote');
    if (!controls.length || !headline || !body || !outputRow || !outputValue || !outputBar || !outputNote || !internalValue || !internalBar || !internalNote) return;
    controls[0].parentElement.hidden = false;

    const update = (system) => {
      const isGuard = system === 'guard';
      headline.textContent = isGuard
        ? 'The output sits at chance. An internal state reaches 0.94.'
        : 'A general-purpose backbone makes the distinction even clearer: 0.98.';
      body.textContent = isGuard
        ? 'The same specialized guard contains the context distinction its own safe/unsafe verdict does not express.'
        : 'Before safety fine-tuning, the underlying language model already carries a sharply readable context signal.';
      outputRow.hidden = !isGuard;
      outputValue.textContent = '≈ 0.50';
      outputBar.style.setProperty('--score', 50);
      outputNote.textContent = 'at or below chance across all three guards';
      internalValue.textContent = isGuard ? '0.94' : '0.98';
      internalBar.style.setProperty('--score', isGuard ? 94 : 98);
      internalNote.textContent = isGuard
        ? 'inside the evaluated guard models'
        : 'inside the general-purpose backbones';
      controls.forEach((control) => {
        const active = control.dataset.signalSystem === system;
        control.classList.toggle('is-active', active);
        control.setAttribute('aria-pressed', String(active));
      });
    };

    controls.forEach((control) => control.addEventListener('click', () => update(control.dataset.signalSystem)));
    update('guard');
  }

  /* Six-benchmark LOBO result chart ------------------------------------ */

  const resultSystems = [
    { key: 'qwen', label: 'Qwen3Guard-4B', values: [0.43, 0.35, 0.36, 0.43, 0.50, 0.79], mean: 0.48 },
    { key: 'llama', label: 'LlamaGuard3-8B', values: [0.65, 0.48, 0.40, 0.54, 0.74, 0.86], mean: 0.61 },
    { key: 'dog', label: 'AgentDoG-4B', values: [0.92, 0.43, 0.61, 0.80, 0.78, 0.92], mean: 0.74 },
    { key: 'agent', label: 'Agent-SIREN · Qwen3-4B', values: [0.92, 0.54, 0.65, 0.68, 0.84, 1.00], mean: 0.77 },
  ];

  const resultBenchmarks = [
    { label: 'R-Judge', mobileLabel: 'R-Judge', kind: 'mixed' },
    { label: 'TraceSafe', mobileLabel: 'TraceSafe', kind: 'tool use' },
    { label: 'ATBench', mobileLabel: 'ATBench', kind: 'tool use' },
    { label: 'ASSE-Safety', mobileLabel: 'ASSE-Saf.', kind: 'mixed' },
    { label: 'ASSE-Security', mobileLabel: 'ASSE-Sec.', kind: 'mixed' },
    { label: 'AgentHarm', mobileLabel: 'AgentHarm', kind: 'harmful content' },
    { label: 'Six-benchmark mean', mobileLabel: 'Mean', kind: 'mean' },
  ];

  function initResultChart() {
    const chart = document.getElementById('agentResultChart');
    const tooltip = document.getElementById('agentChartTooltip');
    if (!chart || !tooltip) return;

    chart.replaceChildren();
    chart.appendChild(svgElement('title', { id: 'agentResultTitle' }, 'Agent-SIREN and three open guard checkpoints across six held-out benchmarks'));
    chart.appendChild(svgElement('desc', { id: 'agentResultDesc' }, 'A horizontal dot chart. Agent-SIREN on Qwen3-4B has the highest or tied macro-F1 on five of six benchmarks and the highest mean.'));

    const compact = window.matchMedia('(max-width: 660px)').matches;
    const width = compact ? 360 : 1080;
    const chartHeight = compact ? 525 : 520;
    const left = compact ? 108 : 184;
    const right = compact ? 342 : 1020;
    const top = compact ? 58 : 64;
    const rowGap = compact ? 70 : 63;
    const domainMin = 0.3;
    const domainMax = 1.0;
    const x = (value) => left + ((value - domainMin) / (domainMax - domainMin)) * (right - left);
    const offsets = [-12, -4, 4, 12];

    chart.setAttribute('viewBox', `0 0 ${width} ${chartHeight}`);
    chart.classList.toggle('is-compact', compact);
    chart.parentElement.classList.toggle('is-compact', compact);

    chart.appendChild(svgElement('rect', {
      x: 0,
      y: top + 6 * rowGap - 27,
      width,
      height: 54,
      class: 'agent-chart-mean-band',
    }));

    const tickValues = compact ? [0.3, 0.5, 0.7, 0.9, 1.0] : [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    tickValues.forEach((tickValue) => {
      chart.appendChild(svgElement('line', {
        x1: x(tickValue), y1: top - 34, x2: x(tickValue), y2: top + 6 * rowGap + 31,
        class: 'agent-chart-grid',
      }));
      chart.appendChild(svgElement('text', {
        x: x(tickValue), y: top - 43, 'text-anchor': 'middle', class: 'agent-chart-axis',
      }, tickValue.toFixed(1)));
    });

    const groups = new Map();
    resultSystems.forEach((system) => {
      const group = svgElement('g', { class: 'agent-chart-system-group', 'data-system': system.key });
      groups.set(system.key, group);
      chart.appendChild(group);
    });

    resultBenchmarks.forEach((benchmark, rowIndex) => {
      const y = top + rowIndex * rowGap;
      if (rowIndex < resultBenchmarks.length - 1) {
        chart.appendChild(svgElement('line', {
          x1: left, y1: y + 30, x2: right, y2: y + 30, class: 'agent-chart-row-line',
        }));
      }
      const label = svgElement('text', {
        x: left - 20, y: y - 2, 'text-anchor': 'end', class: `agent-chart-row-label${benchmark.kind === 'tool use' ? ' is-tool' : ''}`,
      }, compact ? benchmark.mobileLabel : benchmark.label);
      chart.appendChild(label);
      chart.appendChild(svgElement('text', {
        x: left - 20, y: y + 14, 'text-anchor': 'end', class: 'agent-chart-row-sub',
      }, benchmark.kind));

      const values = resultSystems.map((system) => rowIndex === 6 ? system.mean : system.values[rowIndex]);
      chart.appendChild(svgElement('line', {
        x1: x(Math.min(...values)), y1: y, x2: x(Math.max(...values)), y2: y, class: 'agent-chart-range',
      }));

      resultSystems.forEach((system, systemIndex) => {
        const score = values[systemIndex];
        const dotY = y + offsets[systemIndex];
        const group = groups.get(system.key);
        group.appendChild(svgElement('circle', {
          cx: x(score), cy: dotY, r: system.key === 'agent' ? 6.4 : 5.7,
          class: `agent-chart-dot ${system.key}`,
        }));
        if (system.key === 'agent') {
          group.appendChild(svgElement('text', {
            x: x(score) + (score > 0.95 ? -11 : 11),
            y: dotY + 3.5,
            'text-anchor': score > 0.95 ? 'end' : 'start',
            class: 'agent-chart-value',
          }, score.toFixed(2)));
        }

        const hit = svgElement('circle', {
          cx: x(score), cy: dotY, r: 12, class: 'agent-chart-hit', tabindex: '0', role: 'button',
          'aria-label': `${system.label}, ${benchmark.label}: ${score.toFixed(2)} macro-F1`,
        });
        const focusSystem = () => setFocus(system.key);
        const releaseSystem = () => {
          tooltip.classList.remove('is-visible');
          setFocus(null);
        };
        const showTooltip = (event) => {
          const bounds = chart.parentElement.getBoundingClientRect();
          const source = event.touches ? event.touches[0] : event;
          const pointerX = typeof source.clientX === 'number' ? source.clientX - bounds.left : x(score) * (bounds.width / width);
          const pointerY = typeof source.clientY === 'number' ? source.clientY - bounds.top : dotY * (bounds.width / width);
          tooltip.innerHTML = `<b>${system.label}</b>${benchmark.label}: ${score.toFixed(2)} macro-F1`;
          tooltip.style.left = `${clamp(pointerX + 12, 8, Math.max(8, bounds.width - 205))}px`;
          tooltip.style.top = `${clamp(pointerY - 22, 42, Math.max(42, bounds.height - 52))}px`;
          tooltip.classList.add('is-visible');
        };
        hit.addEventListener('pointerenter', focusSystem);
        hit.addEventListener('focus', focusSystem);
        hit.addEventListener('pointermove', showTooltip);
        hit.addEventListener('click', showTooltip);
        hit.addEventListener('pointerleave', releaseSystem);
        hit.addEventListener('blur', releaseSystem);
        hit.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          focusSystem();
          tooltip.innerHTML = `<b>${system.label}</b>${benchmark.label}: ${score.toFixed(2)} macro-F1`;
          tooltip.style.left = `${clamp(x(score) * (chart.parentElement.clientWidth / width), 8, chart.parentElement.clientWidth - 205)}px`;
          tooltip.style.top = `${clamp(dotY * (chart.parentElement.clientWidth / width), 42, chartHeight - 55)}px`;
          tooltip.classList.add('is-visible');
        });
        group.appendChild(hit);
      });
    });

    function setFocus(key) {
      chart.classList.toggle('has-focus', Boolean(key));
      for (const [systemKey, group] of groups.entries()) {
        group.classList.toggle('is-focused', key === systemKey);
      }
    }
  }

  /* Generated output versus one-state readout -------------------------- */

  function initReadoutDemo() {
    const chart = document.getElementById('agentReadoutSvg');
    const caption = document.getElementById('agentReadoutCaption');
    const controls = Array.from(document.querySelectorAll('[data-readout-mode]'));
    if (!chart || !caption || !controls.length) return;
    controls[0].parentElement.hidden = false;

    let mode = 'agent';

    function drawCompactReadout() {
      chart.setAttribute('viewBox', '0 0 360 455');
      chart.classList.add('is-compact');
      chart.parentElement.classList.add('is-compact');

      chart.appendChild(svgElement('rect', { x: 28, y: 22, width: 304, height: 132, rx: 5, class: 'readout-node' }));
      chart.appendChild(svgElement('text', { x: 48, y: 44, class: 'readout-small-label' }, 'COMPLETE TRAJECTORY'));
      const rows = [
        ['REQUEST', 65, 112],
        ['TOOL SCHEMA', 84, 164],
        ['ACTION', 103, 91],
        ['OBSERVATION', 122, 150],
        ['RESPONSE', 141, 105],
      ];
      rows.forEach(([label, y, rowWidth]) => {
        chart.appendChild(svgElement('rect', { x: 48, y: y - 13, width: rowWidth, height: 15, rx: 2, class: 'readout-trajectory-row' }));
        chart.appendChild(svgElement('text', { x: 55, y: y - 2, class: 'readout-small-label readout-compact-label' }, label));
      });

      chart.appendChild(svgElement('path', { d: 'M 180 154 V 190', class: 'readout-wire is-active' }));
      chart.appendChild(svgElement('text', { x: 196, y: 177, class: 'readout-small-label' }, 'ENCODE ONCE'));

      const layerStart = 28;
      const layerWidth = 19;
      const layerGap = 7;
      const selectedIndex = 7;
      for (let index = 0; index < 12; index += 1) {
        const layerX = layerStart + index * (layerWidth + layerGap);
        const classNames = ['readout-layer'];
        if (mode === 'agent' && index === selectedIndex) classNames.push('is-selected');
        if (mode === 'generated' && index === 11) classNames.push('is-final');
        chart.appendChild(svgElement('rect', {
          x: layerX, y: 200, width: layerWidth, height: 82, rx: 2, class: classNames.join(' '),
        }));
        chart.appendChild(svgElement('circle', {
          cx: layerX + layerWidth / 2, cy: 241, r: 2.8,
          fill: mode === 'agent' && index === selectedIndex ? '#5ac9bd' : (mode === 'generated' && index === 11 ? '#8290ff' : 'rgba(255,255,255,.18)'),
        }));
      }
      chart.appendChild(svgElement('text', { x: layerStart, y: 193, class: 'readout-small-label' }, 'FROZEN BACKBONE'));
      chart.appendChild(svgElement('text', { x: layerStart, y: 300, class: 'readout-small-label' }, 'EARLY'));
      chart.appendChild(svgElement('text', { x: 332, y: 300, 'text-anchor': 'end', class: 'readout-small-label' }, 'FINAL'));

      if (mode === 'agent') {
        const chosenX = layerStart + selectedIndex * (layerWidth + layerGap) + layerWidth / 2;
        chart.appendChild(svgElement('path', { d: `M ${chosenX} 282 V 328 H 78`, class: 'readout-wire is-active' }));
        chart.appendChild(svgElement('rect', { x: 45, y: 328, width: 132, height: 62, rx: 4, class: 'readout-probe' }));
        chart.appendChild(svgElement('text', { x: 111, y: 351, 'text-anchor': 'middle', class: 'readout-small-label' }, 'ONE L2 PROBE'));
        chart.appendChild(svgElement('text', { x: 111, y: 374, 'text-anchor': 'middle', class: 'readout-main-label' }, 'uᵀh + c'));
        chart.appendChild(svgElement('path', { d: 'M 177 359 H 213', class: 'readout-wire is-active' }));
        chart.appendChild(svgElement('rect', { x: 213, y: 326, width: 102, height: 66, rx: 4, class: 'readout-output' }));
        chart.appendChild(svgElement('text', { x: 264, y: 351, 'text-anchor': 'middle', class: 'readout-small-label' }, 'RISK SCORE'));
        chart.appendChild(svgElement('text', { x: 264, y: 378, 'text-anchor': 'middle', class: 'readout-score' }, '0–1'));
      } else {
        const finalX = layerStart + 11 * (layerWidth + layerGap) + layerWidth / 2;
        chart.appendChild(svgElement('path', { d: `M ${finalX} 282 V 326 H 180`, class: 'readout-wire is-generated' }));
        chart.appendChild(svgElement('rect', { x: 70, y: 326, width: 220, height: 72, rx: 4, class: 'readout-node' }));
        chart.appendChild(svgElement('text', { x: 92, y: 351, class: 'readout-small-label' }, 'GENERATED OUTPUT'));
        ['S', 'A', 'F', 'E'].forEach((token, index) => {
          chart.appendChild(svgElement('rect', { x: 142 + index * 34, y: 361, width: 27, height: 29, rx: 3, class: 'readout-token' }));
          chart.appendChild(svgElement('text', { x: 155.5 + index * 34, y: 381, 'text-anchor': 'middle', class: 'readout-main-label' }, token));
        });
      }
    }

    function draw() {
      chart.replaceChildren();
      chart.appendChild(svgElement('title', { id: 'agentReadoutTitle' }, 'Generated guard compared with Agent-SIREN'));
      chart.appendChild(svgElement('desc', { id: 'agentReadoutDesc' }, 'Agent-SIREN selects one intermediate last-token state in a frozen backbone and applies one L2-regularized linear probe. A generated guard waits for the final state and decodes output tokens.'));

      const compact = window.matchMedia('(max-width: 660px)').matches;
      if (compact) {
        drawCompactReadout();
        caption.innerHTML = mode === 'agent'
          ? '<b>Read the state where risk is clearest.</b> Validation chooses one last-token state; one L2-regularized linear probe turns it into a score.'
          : '<b>Wait for the end, then generate the label.</b> A conventional guard routes the decision through its final state and output tokens.';
        return;
      }

      chart.setAttribute('viewBox', '0 0 980 470');
      chart.classList.remove('is-compact');
      chart.parentElement.classList.remove('is-compact');

      const input = svgElement('g');
      input.appendChild(svgElement('rect', { x: 26, y: 88, width: 205, height: 286, rx: 5, class: 'readout-node' }));
      input.appendChild(svgElement('text', { x: 49, y: 120, class: 'readout-small-label' }, 'COMPLETE TRAJECTORY'));
      const rows = [
        ['REQUEST', 151, 120],
        ['TOOL SCHEMA', 195, 154],
        ['ACTION', 239, 92],
        ['OBSERVATION', 283, 145],
        ['RESPONSE', 327, 108],
      ];
      rows.forEach(([label, y, width]) => {
        input.appendChild(svgElement('rect', { x: 49, y: y - 18, width, height: 27, rx: 2, class: 'readout-trajectory-row' }));
        input.appendChild(svgElement('text', { x: 58, y, class: 'readout-small-label' }, label));
      });
      chart.appendChild(input);

      chart.appendChild(svgElement('path', { d: 'M 231 231 H 283', class: 'readout-wire is-active' }));
      chart.appendChild(svgElement('text', { x: 260, y: 215, 'text-anchor': 'middle', class: 'readout-small-label' }, 'ENCODE ONCE'));

      const layerStart = 294;
      const layerWidth = 25;
      const layerGap = 9;
      const selectedIndex = 7;
      for (let index = 0; index < 12; index += 1) {
        const x = layerStart + index * (layerWidth + layerGap);
        const classNames = ['readout-layer'];
        if (mode === 'agent' && index === selectedIndex) classNames.push('is-selected');
        if (mode === 'generated' && index === 11) classNames.push('is-final');
        chart.appendChild(svgElement('rect', {
          x, y: 128, width: layerWidth, height: 206, rx: 2, class: classNames.join(' '),
        }));
        chart.appendChild(svgElement('circle', {
          cx: x + layerWidth / 2, cy: 231, r: 3.5,
          fill: mode === 'agent' && index === selectedIndex ? '#5ac9bd' : (mode === 'generated' && index === 11 ? '#8290ff' : 'rgba(255,255,255,.18)'),
        }));
      }
      chart.appendChild(svgElement('text', { x: layerStart, y: 105, class: 'readout-small-label' }, 'FROZEN BACKBONE'));
      chart.appendChild(svgElement('text', { x: layerStart, y: 359, class: 'readout-small-label' }, 'EARLY'));
      chart.appendChild(svgElement('text', { x: layerStart + 11 * (layerWidth + layerGap) + layerWidth, y: 359, 'text-anchor': 'end', class: 'readout-small-label' }, 'FINAL'));

      const chosenX = layerStart + selectedIndex * (layerWidth + layerGap) + layerWidth / 2;
      const finalX = layerStart + 11 * (layerWidth + layerGap) + layerWidth;
      if (mode === 'agent') {
        chart.appendChild(svgElement('path', { d: `M ${chosenX} 128 V 75 H 740`, class: 'readout-wire is-active' }));
        chart.appendChild(svgElement('rect', { x: 740, y: 45, width: 104, height: 60, rx: 4, class: 'readout-probe' }));
        chart.appendChild(svgElement('text', { x: 792, y: 69, 'text-anchor': 'middle', class: 'readout-small-label' }, 'ONE L2 PROBE'));
        chart.appendChild(svgElement('text', { x: 792, y: 89, 'text-anchor': 'middle', class: 'readout-main-label' }, 'uᵀh + c'));
        chart.appendChild(svgElement('path', { d: 'M 844 75 H 874', class: 'readout-wire is-active' }));
        chart.appendChild(svgElement('rect', { x: 874, y: 42, width: 85, height: 66, rx: 4, class: 'readout-output' }));
        chart.appendChild(svgElement('text', { x: 916.5, y: 67, 'text-anchor': 'middle', class: 'readout-small-label' }, 'RISK SCORE'));
        chart.appendChild(svgElement('text', { x: 916.5, y: 92, 'text-anchor': 'middle', class: 'readout-score' }, '0–1'));
      } else {
        chart.appendChild(svgElement('path', { d: `M ${finalX} 231 H 739`, class: 'readout-wire is-generated' }));
        chart.appendChild(svgElement('rect', { x: 739, y: 185, width: 70, height: 92, rx: 4, class: 'readout-node' }));
        chart.appendChild(svgElement('text', { x: 774, y: 213, 'text-anchor': 'middle', class: 'readout-small-label' }, 'OUTPUT'));
        ['S', 'A', 'F', 'E'].forEach((token, index) => {
          chart.appendChild(svgElement('rect', { x: 824 + index * 36, y: 211, width: 29, height: 40, rx: 3, class: 'readout-token' }));
          chart.appendChild(svgElement('text', { x: 838.5 + index * 36, y: 236, 'text-anchor': 'middle', class: 'readout-main-label' }, token));
        });
        chart.appendChild(svgElement('path', { d: 'M 809 231 H 824', class: 'readout-wire is-generated' }));
      }

      caption.innerHTML = mode === 'agent'
        ? '<b>Read the state where risk is clearest.</b> Validation chooses one last-token state; one L2-regularized linear probe turns it into a score.'
        : '<b>Wait for the end, then generate the label.</b> A conventional guard routes the decision through its final state and output tokens.';
    }

    controls.forEach((control) => control.addEventListener('click', () => {
      mode = control.dataset.readoutMode;
      controls.forEach((button) => {
        const active = button === control;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      draw();
    }));
    draw();
  }

  /* Distinct risk directions ------------------------------------------- */

  function initDirectionsDemo() {
    const controls = Array.from(document.querySelectorAll('[data-risk]'));
    const plot = document.getElementById('agentAxisPlot');
    const kicker = document.getElementById('agentRiskKicker');
    const headline = document.getElementById('agentRiskHeadline');
    const body = document.getElementById('agentRiskBody');
    const dimensions = document.getElementById('agentRiskDimensions');
    const dimensionLabel = document.getElementById('agentRiskDimensionLabel');
    if (!controls.length || !plot || !kicker || !headline || !body || !dimensions || !dimensionLabel) return;
    controls[0].parentElement.hidden = false;

    const content = {
      tool: {
        kicker: 'Unsafe tool use',
        headline: 'The action only becomes risky in context.',
        body: 'The probe finds this evidence on a largely separate set of internal coordinates.',
        dimensions: '6',
        label: 'coordinates carry half of this risk’s score difference',
      },
      content: {
        kicker: 'Harmful content',
        headline: 'The risk is stated directly in the text.',
        body: 'The same score reads it through a second, largely separate set of internal coordinates.',
        dimensions: '12',
        label: 'coordinates carry half of this risk’s score difference',
      },
      both: {
        kicker: 'One guard, two routes',
        headline: 'A single score can listen to both.',
        body: 'The directions barely overlap, but one linear probe can give each its own weight.',
        dimensions: '0.03',
        label: 'cosine overlap between the two contribution directions',
      },
    };

    const update = (risk) => {
      const view = content[risk];
      if (!view) return;
      plot.dataset.activeRisk = risk;
      kicker.textContent = view.kicker;
      headline.textContent = view.headline;
      body.textContent = view.body;
      dimensions.textContent = view.dimensions;
      dimensionLabel.textContent = view.label;
      controls.forEach((control) => {
        const active = control.dataset.risk === risk;
        control.classList.toggle('is-active', active);
        control.setAttribute('aria-pressed', String(active));
      });
    };

    controls.forEach((control) => control.addEventListener('click', () => update(control.dataset.risk)));
    update('tool');
  }

  /* Measured early exit ------------------------------------------------- */

  function initExitDemo() {
    const stack = document.getElementById('agentExitStack');
    if (!stack) return;

    for (let index = 0; index < 36; index += 1) {
      const layer = document.createElement('span');
      const used = index < 24;
      layer.classList.toggle('is-used', used);
      layer.classList.toggle('is-stop', index === 23);
      stack.appendChild(layer);
    }
  }

  /* Gentle progressive reveal ----------------------------------------- */

  function initReveal() {
    const items = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!items.length || reducedMotion || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('agent-enhanced');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -3% 0px' });
    items.forEach((item) => observer.observe(item));
  }

  const initializers = [
    initHeroLayers,
    initContextDemo,
    initSignalDemo,
    initResultChart,
    initReadoutDemo,
    initDirectionsDemo,
    initExitDemo,
    initReveal,
  ];

  initializers.forEach((initialize) => {
    try {
      initialize();
    } catch (error) {
      console.warn(`[Agent-SIREN] ${initialize.name} unavailable:`, error);
    }
  });
})();
