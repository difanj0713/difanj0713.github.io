// Keep a normal image link as a fallback; enlarge figures in place when supported.
const figureDialog = document.querySelector('#figure-dialog');
if (figureDialog && typeof figureDialog.showModal === 'function') {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.figure-preview');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const image = link.querySelector('img');
    const enlarged = figureDialog.querySelector('.figure-dialog-image');
    enlarged.src = link.href;
    enlarged.alt = image.alt;
    figureDialog.querySelector('#figure-dialog-title').textContent = link.dataset.figureTitle;
    figureDialog.showModal();
    document.body.classList.add('figure-open');
  });
  figureDialog.querySelector('.figure-dialog-close').addEventListener('click', () => figureDialog.close());
  figureDialog.addEventListener('click', (event) => {
    if (event.target !== figureDialog) return;
    const bounds = figureDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) figureDialog.close();
  });
  figureDialog.addEventListener('close', () => document.body.classList.remove('figure-open'));
}
