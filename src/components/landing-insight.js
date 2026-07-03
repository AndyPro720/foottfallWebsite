const INSIGHTS = [
  {
    title: 'BKC is pulling premium F&B demand.',
    meta: '6 available matches across Mumbai and Dubai.',
    kicker: 'Trade Area',
    primary: 'BKC',
    secondary: '90,000+',
    tertiary: 'INR 420/sqft',
    available: '14'
  },
  {
    title: 'Downtown Dubai has flagship-ready weekday traffic.',
    meta: 'Mock intelligence now covers Dubai launch corridors.',
    kicker: 'Trade Area',
    primary: 'Downtown',
    secondary: '125,000+',
    tertiary: 'AED 620/sqft',
    available: '12'
  },
  {
    title: 'Bandra Kurla and Juhu are screening lifestyle demand.',
    meta: 'Mumbai properties are searchable by area, size, and fit.',
    kicker: 'City',
    primary: 'Mumbai',
    secondary: '82,000+',
    tertiary: 'INR 360/sqft',
    available: '18'
  },
  {
    title: 'Dubai Marina is clustering wellness and cafe formats.',
    meta: 'Early access users can test cross-city market signals.',
    kicker: 'City',
    primary: 'Dubai',
    secondary: '98,000+',
    tertiary: 'AED 480/sqft',
    available: '11'
  }
];

export function initLandingInsight() {
  const card = document.querySelector('.journey-insight');
  if (!card) return;

  const nodes = {
    title: document.getElementById('landing-insight-title'),
    meta: document.getElementById('landing-insight-meta'),
    kicker: document.getElementById('landing-insight-kicker'),
    primary: document.getElementById('landing-insight-primary'),
    secondary: document.getElementById('landing-insight-secondary'),
    tertiary: document.getElementById('landing-insight-tertiary'),
    available: document.getElementById('landing-insight-available')
  };

  let index = 0;
  const intervalMs = 4800;
  let timer = 0;

  const setText = (key, value) => {
    if (nodes[key]) nodes[key].textContent = value;
  };

  const render = (nextIndex) => {
    const next = INSIGHTS[nextIndex];
    if (!next) return;

    setText('title', next.title);
    setText('meta', next.meta);
    setText('kicker', next.kicker);
    setText('primary', next.primary);
    setText('secondary', next.secondary);
    setText('tertiary', next.tertiary);
    setText('available', next.available);

    card.classList.remove('is-changing', 'is-progressing');
    void card.offsetWidth;
    card.classList.add('is-changing', 'is-progressing');
    window.setTimeout(() => card.classList.remove('is-changing'), 520);
  };

  const schedule = () => {
    window.clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    card.classList.remove('is-progressing');
    void card.offsetWidth;
    card.classList.add('is-progressing');
    timer = window.setInterval(() => {
      index = (index + 1) % INSIGHTS.length;
      render(index);
    }, intervalMs);
  };

  card.addEventListener('mouseenter', () => {
    window.clearInterval(timer);
    card.classList.remove('is-progressing');
  });
  card.addEventListener('mouseleave', schedule);
  schedule();
}
