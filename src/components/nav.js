/**
 * Navigation Component — Foottfall Website
 *
 * Features:
 * - Hamburger toggle for mobile
 * - Smooth scroll to sections on nav link click
 * - Active section highlight via IntersectionObserver
 */

export function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const navLinks = document.querySelectorAll('.nav__link');
  const sections = document.querySelectorAll('.snap-section');

  // ---- Hamburger Toggle ----
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      links.classList.toggle('nav__links--open', !isOpen);
    });
  }

  // ---- Smooth Scroll on Link Click ----
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetEl = document.querySelector(targetId);

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }

      // Close mobile menu if open
      if (toggle && links) {
        toggle.setAttribute('aria-expanded', 'false');
        links.classList.remove('nav__links--open');
      }
    });
  });

  // ---- Active Section Detection ----
  if (sections.length > 0 && navLinks.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;

            navLinks.forEach(link => {
              const linkSection = link.getAttribute('data-section');
              if (linkSection === id) {
                link.classList.add('nav__link--active');
              } else {
                link.classList.remove('nav__link--active');
              }
            });
          }
        });
      },
      {
        root: null,
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0
      }
    );

    sections.forEach(section => observer.observe(section));
  }
}
