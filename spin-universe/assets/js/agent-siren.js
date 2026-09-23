(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgElement(name, attributes = {}, textContent = '') {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    if (textContent) element.textContent = textContent;
    return element;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

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

  const resultSystems = [
    { key: 'qwen', label: 'Qwen3Guard-4B', values: [0.322, 0.347, 0.368, 0.436, 0.382, 0.158], mean: 0.336 },
    { key: 'llama', label: 'LlamaGuard3-8B', values: [0.663, 0.486, 0.389, 0.606, 0.359, 0.211], mean: 0.452 },
    { key: 'dog', label: 'AgentDoG-4B', values: [0.927, 0.447, 0.633, 0.814, 0.433, 0.377], mean: 0.605 },
    { key: 'agent-llama', label: 'TACIT · Llama-3.1-8B · Multi-layer', values: [0.970, 0.896, 0.950, 0.885, 0.698, 0.722], mean: 0.854 },
    { key: 'agent', label: 'TACIT · Qwen3-4B · Multi-layer', values: [0.970, 0.865, 0.945, 0.898, 0.727, 0.769], mean: 0.862 },
  ];

  const resultBenchmarks = [
    { label: 'R-Judge', mobileLabel: 'R-Judge', kind: 'mixed' },
    { label: 'TraceSafe', mobileLabel: 'TraceSafe', kind: 'tool use' },
    { label: 'ATBench', mobileLabel: 'ATBench', kind: 'tool use' },
    { label: 'ASSEBench', mobileLabel: 'ASSEBench', kind: 'mixed' },
    { label: 'OpenAgentSafety', mobileLabel: 'OAS', kind: 'mixed' },
    { label: 'AgentDojo', mobileLabel: 'AgentDojo', kind: 'tool use' },
    { label: 'Six-benchmark mean', mobileLabel: 'Mean', kind: 'mean' },
  ];

  function initResultChart() {
    const chart = document.getElementById('agentResultChart');
    const tooltip = document.getElementById('agentChartTooltip');
    if (!chart || !tooltip) return;

    chart.replaceChildren();
    chart.appendChild(svgElement('title', { id: 'agentResultTitle' }, 'TACIT and open guard checkpoints across six benchmarks'));
    chart.appendChild(svgElement('desc', { id: 'agentResultDesc' }, 'TACIT reaches the highest mean macro-F1 and outperforms every evaluated guard on every benchmark.'));

    const compact = window.matchMedia('(max-width: 660px)').matches;
    const width = compact ? 360 : 1080;
    const chartHeight = compact ? 535 : 530;
    const left = compact ? 108 : 184;
    const right = compact ? 342 : 1020;
    const top = compact ? 62 : 68;
    const rowGap = compact ? 70 : 64;
    const domainMin = 0.1;
    const domainMax = 1.0;
    const x = (value) => left + ((value - domainMin) / (domainMax - domainMin)) * (right - left);
    const offsets = [-16, -8, 0, 8, 16];

    chart.setAttribute('viewBox', `0 0 ${width} ${chartHeight}`);
    chart.classList.toggle('is-compact', compact);
    chart.parentElement.classList.toggle('is-compact', compact);

    chart.appendChild(svgElement('rect', {
      x: 0,
      y: top + 6 * rowGap - 29,
      width,
      height: 58,
      class: 'agent-chart-mean-band',
    }));

    const tickValues = compact ? [0.1, 0.3, 0.5, 0.7, 0.9] : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    tickValues.forEach((tickValue) => {
      chart.appendChild(svgElement('line', {
        x1: x(tickValue), y1: top - 38, x2: x(tickValue), y2: top + 6 * rowGap + 33,
        class: 'agent-chart-grid',
      }));
      chart.appendChild(svgElement('text', {
        x: x(tickValue), y: top - 47, 'text-anchor': 'middle', class: 'agent-chart-axis',
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
          x1: left, y1: y + 31, x2: right, y2: y + 31, class: 'agent-chart-row-line',
        }));
      }
      chart.appendChild(svgElement('text', {
        x: left - 20, y: y - 2, 'text-anchor': 'end',
        class: `agent-chart-row-label${benchmark.kind === 'tool use' ? ' is-tool' : ''}`,
      }, compact ? benchmark.mobileLabel : benchmark.label));
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
          cx: x(score), cy: dotY, r: system.key.startsWith('agent') ? 6.2 : 5.5,
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

  function initExitDemo() {
    const stack = document.getElementById('agentExitStack');
    if (!stack) return;

    for (let index = 0; index < 36; index += 1) {
      const layer = document.createElement('span');
      const used = index < 23;
      layer.classList.toggle('is-used', used);
      layer.classList.toggle('is-stop', index === 22);
      stack.appendChild(layer);
    }
  }

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

  [initHeroLayers, initResultChart, initExitDemo, initReveal].forEach((initialize) => {
    try {
      initialize();
    } catch (error) {
      console.warn(`[TACIT] ${initialize.name} unavailable:`, error);
    }
  });
})();
