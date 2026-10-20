/* Without JavaScript, every comparison and trajectory prefix remains visible. */
function setupTabs(tablist, afterSelect = () => {}) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  function select(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
    afterSelect(index);
  }
  panels.forEach((panel, i) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[i].id);
    panel.tabIndex = 0;
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next, true);
    });
  });
  select(0);
  return {select, count: tabs.length};
}

document.querySelectorAll('.benchmark-tabs').forEach(tablist => {
  setupTabs(tablist);
  tablist.hidden = false;
});

const trace = document.querySelector('.trace-example');
if (trace) {
  const controls = trace.querySelector('.trace-controls');
  const navigation = trace.querySelector('.trace-navigation');
  const previous = trace.querySelector('[data-direction="previous"]');
  const next = trace.querySelector('[data-direction="next"]');
  const position = trace.querySelector('.trace-position');
  let current = 0;
  const count = trace.querySelectorAll('.trace-step').length;
  const tabs = setupTabs(trace.querySelector('.trace-tabs'), index => {
    current = index;
    previous.disabled = index === 0;
    next.disabled = index === count - 1;
    position.textContent = `${index + 1} of ${count}`;
  });
  previous.addEventListener('click', () => tabs.select(Math.max(0, current - 1)));
  next.addEventListener('click', () => tabs.select(Math.min(count - 1, current + 1)));
  controls.hidden = false;
  navigation.hidden = false;
}
