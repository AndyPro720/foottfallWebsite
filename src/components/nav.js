export function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const nav = document.getElementById('main-nav');
  const shell = document.querySelector('.site-shell');

  if (!toggle || !links || !nav) {
    return;
  }

  // Use the .site-shell as scroll container on desktop (it has overflow-y: auto)
  const getScrollContainer = () =>
    window.innerWidth >= 901 && shell ? shell : window;

  const closeMenu = () => {
    links.classList.remove('is-open');
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.classList.toggle('is-active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('.nav__link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const targetId = link.getAttribute('href');
      const target = targetId ? document.querySelector(targetId) : null;

      if (target) {
        target.scrollIntoView({
          behavior: window.innerWidth >= 901 ? 'auto' : 'smooth',
          block: 'start',
        });
      }

      if (link.hasAttribute('data-trigger-intelligence')) {
        window.setTimeout(() => {
          document.querySelector('.journey__action')?.click();
        }, 520);
      }

      closeMenu();
    });
  });

  let navFrame = 0;

  const updateScrolledState = () => {
    navFrame = 0;
    const container = getScrollContainer();
    const scrollY =
      container === window ? window.scrollY : container.scrollTop;
    nav.classList.toggle('nav--scrolled', scrollY > 56);
  };

  const requestScrolledState = () => {
    if (navFrame) {
      return;
    }

    navFrame = window.requestAnimationFrame(updateScrolledState);
  };

  updateScrolledState();

  // Listen on both window and shell to cover resize changes
  window.addEventListener('scroll', requestScrolledState, { passive: true });
  if (shell) {
    shell.addEventListener('scroll', requestScrolledState, { passive: true });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      closeMenu();
    }
  });

  const observedSections = document.querySelectorAll('[data-nav-section][id]');
  const navLinks = document.querySelectorAll('.nav__link[data-section]');

  if (!observedSections.length || !navLinks.length) {
    return;
  }

  const observerRoot = window.innerWidth >= 901 ? shell : null;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const id = entry.target.id;
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      });
    },
    {
      root: observerRoot,
      threshold: 0.35,
      rootMargin: '-10% 0px -45% 0px',
    },
  );

  observedSections.forEach((section) => observer.observe(section));
}
