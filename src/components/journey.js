export function initJourneyInteractions() {
  const cityItems = document.querySelectorAll('.cities__list li, .cities__list--dual li');
  const methodChips = document.querySelectorAll('.method__stage-chip');
  const action = document.querySelector('.journey__action');
  const note = document.querySelector('.journey__action-note');
  let noteTimer;

  cityItems.forEach((item) => {
    item.tabIndex = 0;
    item.addEventListener('click', () => {
      cityItems.forEach((entry) => entry.classList.remove('is-active'));
      item.classList.add('is-active');
    });
  });

  methodChips.forEach((chip) => {
    chip.tabIndex = 0;
    chip.addEventListener('click', () => {
      methodChips.forEach((entry) => entry.classList.remove('is-active'));
      chip.classList.add('is-active');
    });
  });

  if (!action || !note) {
    return;
  }

  action.addEventListener('click', () => {
    clearTimeout(noteTimer);
    note.classList.add('is-visible');
    noteTimer = window.setTimeout(() => {
      note.classList.remove('is-visible');
    }, 3200);
  });
}
