/* The average chart and full results table remain readable without JavaScript. */
const selector = document.querySelector('#benchmark-select');
if (selector) {
  const panels = [...document.querySelectorAll('.benchmark-panel')];
  const status = document.querySelector('#benchmark-status');
  selector.addEventListener('change', () => {
    panels.forEach((panel) => {
      panel.hidden = panel.id !== `benchmark-${selector.value}`;
    });
    const panel = document.getElementById(`benchmark-${selector.value}`);
    status.textContent = `${selector.selectedOptions[0].textContent}. ${panel.querySelector('.benchmark-takeaway').textContent}.`;
  });
  selector.closest('.benchmark-picker').hidden = false;
}
