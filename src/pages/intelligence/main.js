import { FiltersController } from './filters.js';
import { MapComponent } from './map.js';
import { SidebarController } from './sidebar.js';
import { UIController } from './ui.js';

function showFatalError(error) {
  console.error('Failed to initialize Foottfall Intelligence.', error);
  const legend = document.getElementById('legend');
  if (legend) {
    const message = document.createElement('p');
    message.className = 'intel-error';
    message.textContent = 'Failed to load map data. Please check your network connection and reload.';
    legend.replaceChildren(message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const sidebar = new SidebarController().init();
    let ui;

    const map = new MapComponent({
      onTradeAreaChange: (details) => sidebar.renderTradeArea(details),
      onViewChange: (view) => ui?.updateBreadcrumb(view)
    }).init();

    const filters = new FiltersController({
      map,
      onResults: (results) => sidebar.renderMatches(results)
    }).init();

    ui = new UIController({ map, filters, sidebar }).init();
    window.foottfallIntelligence = { map, filters, sidebar, ui };
  } catch (error) {
    showFatalError(error);
  }
});
