const FLOWS = { WIZARD: 'wizard', EXPLORE: 'explore', DETAIL: 'detail' };

function readFlowParam() {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get('flow');
  if (flow === 'match') return FLOWS.WIZARD;
  if (flow === 'explore') return FLOWS.EXPLORE;
  return FLOWS.EXPLORE;
}

export class FlowController {
  constructor({ map, sidebar, wizard, onFlowChange } = {}) {
    this.map = map;
    this.sidebar = sidebar;
    this.wizard = wizard;
    this.onFlowChange = onFlowChange || (() => {});
    this.currentFlow = null;

    this.wizardOverlay = document.getElementById('wizard-overlay');
    this.explorePanel = document.getElementById('explore-panel-container');
  }

  setWizard(wizard) {
    this.wizard = wizard;
  }

  init() {
    const flow = readFlowParam();
    this.setFlow(flow);
    return this;
  }

  setFlow(flow) {
    if (this.currentFlow === flow) return;
    this.currentFlow = flow;

    document.body.setAttribute('data-flow', flow);

    if (flow === FLOWS.WIZARD) {
      this.showWizard();
    } else if (flow === FLOWS.EXPLORE) {
      this.showExplore();
    } else if (flow === FLOWS.DETAIL) {
      this.showDetail();
    }

    this.onFlowChange(flow);
  }

  showWizard() {
    if (this.wizardOverlay) this.wizardOverlay.hidden = false;
    if (this.explorePanel) this.explorePanel.hidden = true;
    this.sidebar?.hide?.();
    this.wizard?.start?.();
  }

  showExplore() {
    if (this.wizardOverlay) this.wizardOverlay.hidden = true;
    if (this.explorePanel) this.explorePanel.hidden = false;
  }

  showDetail() {
    if (this.wizardOverlay) this.wizardOverlay.hidden = true;
    if (this.explorePanel) this.explorePanel.hidden = true;
  }

  enterDetail() {
    this.setFlow(FLOWS.DETAIL);
  }

  exitDetail() {
    const fallback = readFlowParam();
    this.setFlow(fallback === FLOWS.WIZARD ? FLOWS.WIZARD : FLOWS.EXPLORE);
  }

  exitWizard() {
    this.setFlow(FLOWS.EXPLORE);
  }

  // Launch the matching wizard fresh from anywhere (e.g. the explore CTA).
  startMatch() {
    this.currentFlow = null;
    this.setFlow(FLOWS.WIZARD);
  }

  // Fully drop the tailored funnel and become a proper free-explore session.
  enterFreeExplore({ showCityAreas = false, city: requestedCity = null } = {}) {
    const view = this.map?.getCurrentView?.() || {};
    const city = showCityAreas ? (requestedCity || view.city) : null;
    this.sidebar?.hideAll?.();
    this.map?.clearTradeAreaHighlights?.();
    if (window.foottfallIntelligence) window.foottfallIntelligence.tailoredResults = null;
    this.currentFlow = null;
    this.setFlow(FLOWS.EXPLORE);
    if (city) this.sidebar?.showCityAreas?.(city);
  }

  // Reopen the wizard at the requirements step, preserving the user's selections.
  reopenWizard() {
    this.currentFlow = FLOWS.WIZARD;
    document.body.setAttribute('data-flow', FLOWS.WIZARD);
    if (this.wizardOverlay) this.wizardOverlay.hidden = false;
    if (this.explorePanel) this.explorePanel.hidden = true;
    this.sidebar?.hideAll?.();
    this.wizard?.resumeRequirements?.();
  }

  getFlow() {
    return this.currentFlow;
  }

  isWizard() {
    return this.currentFlow === FLOWS.WIZARD;
  }

  isExplore() {
    return this.currentFlow === FLOWS.EXPLORE;
  }
}

export { FLOWS };
export default FlowController;
