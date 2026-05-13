import { initJourneyInteractions } from './components/journey.js';
import { initBrandCarousel } from './components/brand-carousel.js';
import { initNav } from './components/nav.js';
import { initScrollProgress } from './components/scroll-progress.js';
import { initScrollReveal } from './components/scroll-reveal.js';

document.addEventListener('DOMContentLoaded', () => {
  initBrandCarousel();
  initJourneyInteractions();
  initNav();
  initScrollProgress();
  initScrollReveal();
});
