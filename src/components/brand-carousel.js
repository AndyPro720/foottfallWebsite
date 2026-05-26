export function initBrandCarousel() {
  const track = document.querySelector('.brands__track');
  const previousButton = document.querySelector('.brands__arrow[aria-label="Previous brands"]');
  const nextButton = document.querySelector('.brands__arrow[aria-label="Next brands"]');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let autoScrollTimer = 0;
  let autoScrollResumeTimer = 0;
  let autoScrollEnabled = true;

  if (!track || track.children.length <= 1) {
    return;
  }

  const getScrollDistance = () => {
    const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const firstItem = track.querySelector('.brands__item');
    const itemWidth = firstItem?.getBoundingClientRect().width || 220;

    return itemWidth + gap;
  };

  const scrollTrack = (direction = 1) => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const distance = getScrollDistance();

    if (direction > 0 && track.scrollLeft >= maxScroll - 4) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    if (direction < 0 && track.scrollLeft <= 4) {
      track.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }

    track.scrollBy({ left: distance * direction, behavior: 'smooth' });
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer) {
      window.clearInterval(autoScrollTimer);
      autoScrollTimer = 0;
    }
  };

  const clearAutoScrollResume = () => {
    if (autoScrollResumeTimer) {
      window.clearTimeout(autoScrollResumeTimer);
      autoScrollResumeTimer = 0;
    }
  };

  const startAutoScroll = () => {
    if (!autoScrollEnabled) {
      stopAutoScroll();
      return;
    }

    clearAutoScrollResume();
    stopAutoScroll();
    autoScrollTimer = window.setInterval(() => {
      scrollTrack(1);
    }, 2200);
  };

  const scheduleAutoScrollResume = (delay = 2200) => {
    if (!autoScrollEnabled) {
      clearAutoScrollResume();
      return;
    }

    clearAutoScrollResume();
    autoScrollResumeTimer = window.setTimeout(() => {
      startAutoScroll();
    }, delay);
  };

  const syncAutoScrollMode = () => {
    autoScrollEnabled = !reducedMotionQuery.matches;

    if (autoScrollEnabled) {
      startAutoScroll();
      return;
    }

    clearAutoScrollResume();
    stopAutoScroll();
  };

  previousButton?.addEventListener('click', () => {
    scrollTrack(-1);
    scheduleAutoScrollResume();
  });

  nextButton?.addEventListener('click', () => {
    scrollTrack(1);
    scheduleAutoScrollResume();
  });

  track.addEventListener('mouseenter', stopAutoScroll);
  track.addEventListener('mouseleave', startAutoScroll);
  track.addEventListener('focusin', stopAutoScroll);
  track.addEventListener('focusout', scheduleAutoScrollResume);
  track.addEventListener('pointerdown', stopAutoScroll, { passive: true });
  track.addEventListener('pointerup', () => scheduleAutoScrollResume(1800), { passive: true });
  track.addEventListener('pointercancel', () => scheduleAutoScrollResume(1800), { passive: true });

  window.addEventListener('resize', syncAutoScrollMode);
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', syncAutoScrollMode);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(syncAutoScrollMode);
  }

  syncAutoScrollMode();
}
