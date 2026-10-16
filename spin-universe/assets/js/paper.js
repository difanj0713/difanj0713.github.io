// Footnotes work with mouse, touch and keyboard; paper contents are static HTML.
document.querySelectorAll('.ltx_note > .ltx_note_mark[role="button"]').forEach(mark => {
  const toggle = () => {
    const open = mark.parentElement.classList.toggle('is-open');
    mark.setAttribute('aria-expanded', String(open));
  };
  mark.addEventListener('click', toggle);
  mark.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });
});
