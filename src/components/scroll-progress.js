export function initScrollProgress() {
  const shell = document.querySelector('.site-shell');

  if (document.querySelector('.scroll-progress')) {
    return;
  }

  const progress = document.createElement('div');
  const bar = document.createElement('span');

  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  bar.className = 'scroll-progress__bar';
  progress.append(bar);
  document.body.append(progress);

  const getScrollContainer = () =>
    window.innerWidth >= 901 && shell ? shell : document.documentElement;

  let frame = 0;

  const update = () => {
    frame = 0;
    const container = getScrollContainer();
    const scrollTop = container === document.documentElement ? window.scrollY : container.scrollTop;
    const scrollHeight =
      container === document.documentElement
        ? document.documentElement.scrollHeight - window.innerHeight
        : container.scrollHeight - container.clientHeight;
    const progressValue = scrollHeight > 0 ? Math.min(Math.max(scrollTop / scrollHeight, 0), 1) : 0;

    bar.style.transform = `scaleY(${progressValue})`;
  };

  const requestUpdate = () => {
    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  if (shell) {
    shell.addEventListener('scroll', requestUpdate, { passive: true });
  }
}
