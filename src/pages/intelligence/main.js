import { FiltersController } from './filters.js';
import { FlowController } from './flow.js';
import { MapComponent } from './map.js';
import { SidebarController } from './sidebar.js';
import { UIController } from './ui.js';
import { WizardController } from './wizard.js';

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

const initApp = () => {
  try {
    let ui;

    const sidebar = new SidebarController().init();

    const map = new MapComponent({
      onTradeAreaChange: (details) => sidebar.renderTradeArea(details),
      onCityChange: (city) => {
        // City tier-list is for self-guided exploring only — never during the wizard or tailored funnel.
        if (!sidebar.tailoredMode && document.body.dataset.flow !== 'wizard') sidebar.showCityAreas(city);
      },
      onViewChange: (view) => ui?.updateBreadcrumb(view)
    }).init();

    sidebar.map = map;
    map.sidebar = sidebar;

    const filters = new FiltersController({
      map,
      onResults: (results) => sidebar.renderMatches(results)
    }).init();

    ui = new UIController({ map, filters, sidebar }).init();

    const flow = new FlowController({
      map,
      sidebar,
      onFlowChange: () => ui?.refreshSpotlight?.(map.getCurrentView?.())
    });
    sidebar.flow = flow;
    if (ui) ui.flow = flow;
    const wizard = new WizardController({ map, sidebar, flow }).init();
    flow.setWizard(wizard);
    flow.init();

    document.getElementById('refilter-btn')?.addEventListener('click', () => flow.reopenWizard());

    window.foottfallIntelligence = { map, filters, sidebar, ui, flow, wizard };
  } catch (error) {
    showFatalError(error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
