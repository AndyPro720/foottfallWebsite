const DESKTOP_MEDIA = '(min-width: 901px)';
const MOBILE_MEDIA = '(max-width: 900px), (hover: none) and (pointer: coarse)';
const MAX_REVEAL_DELAY_MS = 420;
const REVEAL_STAGGER_MS = 110;
const MOBILE_MAX_REVEAL_DELAY_MS = 180;
const MOBILE_REVEAL_STAGGER_MS = 55;
const ENTER_THRESHOLD = 0.24;
const MOBILE_ENTER_THRESHOLD = 0.08;

export function initScrollReveal() {
  const elements = Array.from(document.querySelectorAll('.reveal'));

  if (elements.length === 0) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMotion = window.matchMedia(MOBILE_MEDIA);

  if (reducedMotion.matches) {
    elements.forEach((element) => element.classList.add('reveal--visible'));
    return;
  }

  const applyRevealDelays = () => {
    const sectionCounts = new Map();
    const stagger = mobileMotion.matches ? MOBILE_REVEAL_STAGGER_MS : REVEAL_STAGGER_MS;
    const maxDelay = mobileMotion.matches ? MOBILE_MAX_REVEAL_DELAY_MS : MAX_REVEAL_DELAY_MS;

    elements.forEach((element) => {
      const section = element.closest('.page-section') ?? document.body;
      const index = sectionCounts.get(section) ?? 0;
      const delay = Math.min(index * stagger, maxDelay);

      element.style.setProperty('--reveal-delay', `${delay}ms`);
      sectionCounts.set(section, index + 1);
    });
  };

  applyRevealDelays();

  const desktopQuery = window.matchMedia(DESKTOP_MEDIA);
  const shell = document.querySelector('.site-shell');
  let observer;

  const connectObserver = () => {
    const stickyReveal = mobileMotion.matches;
    const revealThreshold = stickyReveal ? MOBILE_ENTER_THRESHOLD : ENTER_THRESHOLD;

    observer?.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= revealThreshold) {
            entry.target.classList.add('reveal--visible');

            if (stickyReveal) {
              observer?.unobserve(entry.target);
            }

            return;
          }

          if (!stickyReveal && !entry.isIntersecting) {
            entry.target.classList.remove('reveal--visible');
          }
        });
      },
      {
        root: desktopQuery.matches ? shell : null,
        threshold: stickyReveal ? [0, MOBILE_ENTER_THRESHOLD, 0.2] : [0, ENTER_THRESHOLD, 0.5],
        rootMargin: stickyReveal ? '0px 0px -8% 0px' : '0px 0px -16% 0px',
      },
    );

    elements.forEach((element) => observer.observe(element));
  };

  connectObserver();

  const handleMediaChange = () => {
    applyRevealDelays();
    connectObserver();
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', handleMediaChange);
  } else {
    desktopQuery.addListener(handleMediaChange);
  }

  if (mobileMotion.addEventListener) {
    mobileMotion.addEventListener('change', handleMediaChange);
  } else {
    mobileMotion.addListener(handleMediaChange);
  }
}
