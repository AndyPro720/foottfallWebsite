export function initJourneyInteractions() {
  const cityItems = document.querySelectorAll('.cities__list li, .cities__list--dual li');
  const cityGroups = document.querySelectorAll('.cities__group');
  const cityGrid = document.querySelector('.cities__grid');
  const methodChips = document.querySelectorAll('.method__stage-chip');
  const popoverCards = document.querySelectorAll('.category-card--popover');
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const supportsTouchPopover = () =>
    window.innerWidth <= 900 ||
    window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const closeAllGroups = () => {
    cityGroups.forEach((entry) => {
      entry.open = false;
    });
  };

  const closeAllPopovers = () => {
    popoverCards.forEach((card) => {
      card.classList.remove('is-open');
      card.setAttribute('aria-expanded', 'false');
    });
  };

  const togglePopover = (card) => {
    const shouldOpen = !card.classList.contains('is-open');

    closeAllPopovers();

    if (!shouldOpen) {
      return;
    }

    card.classList.add('is-open');
    card.setAttribute('aria-expanded', 'true');
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

  popoverCards.forEach((card, index) => {
    const popover = card.querySelector('.category-card__popover');

    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-haspopup', 'true');

    if (popover) {
      const popoverId = popover.id || `category-popover-${index + 1}`;
      popover.id = popoverId;
      card.setAttribute('aria-controls', popoverId);
    }

    card.addEventListener('click', (event) => {
      const clickedPopover = event.target.closest('.category-card__popover');

      if (clickedPopover && !supportsTouchPopover()) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      togglePopover(card);

      if (supportsTouchPopover()) {
        card.blur();
      }
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllPopovers();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePopover(card);
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.category-card--popover')) {
      return;
    }

    closeAllPopovers();
  });

  window.addEventListener('resize', () => {
    closeAllPopovers();
  });

  window.addEventListener(
    'scroll',
    () => {
      if (supportsTouchPopover()) {
        closeAllPopovers();
      }
    },
    { passive: true }
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllPopovers();
    }
  });
}
