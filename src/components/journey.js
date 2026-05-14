export function initJourneyInteractions() {
  const cityItems = document.querySelectorAll('.cities__list li, .cities__list--dual li');
  const cityGroups = document.querySelectorAll('.cities__group');
  const cityGrid = document.querySelector('.cities__grid');
  const methodChips = document.querySelectorAll('.method__stage-chip');
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const closeAllGroups = () => {
    cityGroups.forEach((entry) => {
      entry.open = false;
    });
  };

  cityItems.forEach((item) => {
    item.tabIndex = 0;

    const activateItem = () => {
      cityItems.forEach((entry) => entry.classList.remove('is-active'));
      item.classList.add('is-active');
    };

    item.addEventListener('click', activateItem);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateItem();
      }
    });
  });

  methodChips.forEach((chip) => {
    chip.tabIndex = 0;
    chip.addEventListener('click', () => {
      methodChips.forEach((entry) => entry.classList.remove('is-active'));
      chip.classList.add('is-active');
    });
  });

  cityGroups.forEach((group) => {
    const openGroup = () => {
      cityGroups.forEach((entry) => {
        entry.open = entry === group;
      });
    };

    group.addEventListener('toggle', () => {
      if (!group.open) {
        return;
      }

      cityGroups.forEach((entry) => {
        if (entry !== group) {
          entry.open = false;
        }
      });
    });

    if (supportsHover) {
      group.addEventListener('mouseenter', openGroup);
    }
  });

  if (supportsHover && cityGrid) {
    cityGrid.addEventListener('mouseleave', closeAllGroups);
  }
}
