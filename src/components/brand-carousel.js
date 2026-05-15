export function initBrandCarousel() {
  const track = document.querySelector('.brands__track');
  const previousButton = document.querySelector('.brands__arrow[aria-label="Previous brands"]');
  const nextButton = document.querySelector('.brands__arrow[aria-label="Next brands"]');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let autoScrollTimer = 0;
  let autoScrollResumeTimer = 0;
  let autoScrollEnabled = true;

  const brandDomains = {
    toscano: 'https://www.toscano.co.in',
    salt: 'https://www.saltrestaurants.com',
    tandooriya: 'https://www.tandooriya.com',
    'bread pocket co': 'https://www.breadpocket.com',
    bikanerwala: 'https://www.bikanervala.com',
    'wow momos': 'https://www.wowmomo.com',
    anna: 'https://www.annarestaurant.com',
    antonia: 'https://www.antoniarestaurant.com',
    'pizza di rocco': 'https://www.pizzadirocco.com',
    'al safadi': 'https://www.alsafadi-restaurants.com',
    'social distrikt': 'https://www.socialdistrikt.com',
    'jardin hotels': 'https://www.jardinhotels.com',
    'bloom room': 'https://www.bloomrooms.com',
    'filli cafe': 'https://www.fillicafe.com',
    d11: 'https://www.d11cafe.com',
    marassi: 'https://www.marassigalleria.com',
    dana: 'https://www.danamall.com',
    oasis: 'https://www.oasismalls.com',
    'blvd 1890': 'https://www.blvd1890.com',
    'red sea': 'https://www.redseamall.com',
    cenomi: 'https://www.cenomi.com',
    'jeddah vibes': 'https://www.jeddahvibes.com',
    'sharjah sentral': 'https://www.sharjahcentral.com',
    sharooq: 'https://www.sharooq.com',
    'al ganda mall': 'https://www.algandamall.com',
    'lulu malls': 'https://www.lulumall.in',
    maf: 'https://www.mafglobal.com',
    'silicon sentral': 'https://www.siliconcentralmall.com',
    dalma: 'https://www.dalmamall.ae',
    reem: 'https://www.reemmall.com',
    'abu dhabi mall': 'https://www.abudhabimall.com',
    'city centre doha': 'https://www.citycentredoha.com',
    nayati: 'https://www.nayati.com',
    '14 entrar': 'https://www.14entrar.com',
    'lvl 5': 'https://www.lvl5.com',
    amanora: 'https://www.amanoramall.com',
    phoenix: 'https://www.phoenixmarketcity.com',
    'hcl surat': 'https://www.hclsurat.com',
    'high street apollo': 'https://www.highstreetapollo.com',
    jivana: 'https://www.jivana.com',
    'vegas mall': 'https://www.vegasmall.in',
    dlf: 'https://www.dlf.in',
    inorbit: 'https://www.inorbit.in',
    korum: 'https://www.korummall.com',
    bipl: 'https://www.bipl.co.in',
    'express avenue': 'https://www.expressavenuemall.com',
    'forum kochi': 'https://www.forumkochimall.com',
    'db mall': 'https://www.dbcity.in',
  };

  if (!track || track.children.length <= 1) {
    return;
  }

  track.querySelectorAll('.brands__item--text').forEach((item) => {
    const label = item.querySelector('.brands__label');
    const brandName = label?.textContent.trim().toLowerCase();
    const domain = brandName ? brandDomains[brandName] : '';

    if (!label || !domain || item.querySelector('.brands__logo')) {
      return;
    }

    const logo = document.createElement('img');
    logo.className = 'brands__logo brands__logo--mark';
    logo.alt = label.textContent.trim();
    logo.referrerPolicy = 'no-referrer';
    logo.loading = 'lazy';
    logo.src = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`;

    item.prepend(logo);
    item.classList.add('brands__item--stacked');
  });

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
