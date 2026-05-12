/**
 * Foottfall Website — Main Entry Point
 */

import './style.css';
import { initNav } from './components/nav.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  console.log('Foottfall Website initialized');
});
