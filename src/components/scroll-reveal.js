const DESKTOP_MEDIA = '(min-width: 901px)';
const MAX_REVEAL_DELAY_MS = 420;
const REVEAL_STAGGER_MS = 110;
const ENTER_THRESHOLD = 0.24;

export function initScrollReveal() {
  const elements = Array.from(document.querySelectorAll('.reveal'));

  if (elements.length === 0) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reducedMotion.matches) {
    elements.forEach((element) => element.classList.add('reveal--visible'));
    return;
  }

  const sectionCounts = new Map();

  elements.forEach((element) => {
    const section = element.closest('.page-section') ?? document.body;
    const index = sectionCounts.get(section) ?? 0;
    const delay = Math.min(index * REVEAL_STAGGER_MS, MAX_REVEAL_DELAY_MS);

    element.style.setProperty('--reveal-delay', `${delay}ms`);
    sectionCounts.set(section, index + 1);
  });

  const desktopQuery = window.matchMedia(DESKTOP_MEDIA);
  const shell = document.querySelector('.site-shell');
  let observer;

  const connectObserver = () => {
    observer?.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= ENTER_THRESHOLD) {
            entry.target.classList.add('reveal--visible');
            return;
          }

          if (!entry.isIntersecting) {
            entry.target.classList.remove('reveal--visible');
          }
        });
      },
      {
        root: desktopQuery.matches ? shell : null,
        threshold: [0, ENTER_THRESHOLD, 0.5],
        rootMargin: '0px 0px -16% 0px',
      },
    );

    elements.forEach((element) => observer.observe(element));
  };

  connectObserver();

  const handleMediaChange = () => {
    connectObserver();
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', handleMediaChange);
  } else {
    desktopQuery.addListener(handleMediaChange);
  }
}
