export function validateLeadFields(fields = {}) {
  const required = ['name', 'brand', 'phone', 'email'];
  const missing = required.filter((key) => !String(fields[key] || '').trim());
  const email = String(fields.email || '').trim();
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return {
    valid: missing.length === 0 && emailValid,
    missing,
    emailValid
  };
}

export function getLeadContext(results) {
  if (!results) return '';
  return JSON.stringify({
    query: results.query,
    propertyCount: results.properties.length,
    tradeAreaIds: results.tradeAreaIds
  });
}

function setText(node, value) {
  if (node) node.textContent = String(value || '');
}

function getFormFields(form) {
  const data = new FormData(form);
  return {
    name: data.get('name'),
    brand: data.get('brand'),
    phone: data.get('phone'),
    email: data.get('email')
  };
}

export class UIController {
  constructor(options = {}) {
    this.map = options.map || null;
    this.filters = options.filters || null;
    this.sidebar = options.sidebar || null;
    this.filterPanel = document.getElementById('customisation-panel');
    this.filterBody = document.getElementById('filter-body');
    this.filterToggle = document.getElementById('filter-toggle');
    this.sidebarRoot = document.getElementById('sidebar');
    this.sidebarBody = document.getElementById('sidebar-body');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.modeButtons = document.querySelectorAll('[data-flow]');
    this.cityButtons = document.querySelectorAll('[data-city]');
    this.backButton = document.getElementById('back-button');
    this.breadcrumbList = document.getElementById('breadcrumb-list');
    this.legend = document.getElementById('legend');
    this.leadDialog = document.getElementById('lead-modal');
    this.leadForm = document.getElementById('warm-lead-form');
    this.leadOpen = document.getElementById('warm-lead-open');
    this.leadStatus = document.getElementById('warm-lead-status');
    this.leadSourceUrl = document.getElementById('warm-source-url');
    this.leadMatchContext = document.getElementById('warm-match-context');
  }

  init() {
    this.bindPanelToggles();
    this.bindModes();
    this.bindCityButtons();
    this.bindBackButton();
    this.bindDialogs();
    this.bindLeadForm();
    this.renderLegend();
    this.updateBreadcrumb(this.map?.getCurrentView?.() || { level: 'overview' });
    return this;
  }

  bindPanelToggles() {
    this.filterToggle?.addEventListener('click', () => {
      const collapsed = this.filterPanel?.classList.toggle('is-collapsed');
      if (this.filterBody) this.filterBody.hidden = Boolean(collapsed);
      this.filterToggle.setAttribute('aria-expanded', String(!collapsed));
      setText(this.filterToggle, collapsed ? 'Show' : 'Minimize');
    });

    this.sidebarToggle?.addEventListener('click', () => {
      const collapsed = this.sidebarRoot?.classList.toggle('is-collapsed');
      if (this.sidebarBody) this.sidebarBody.hidden = Boolean(collapsed);
      this.sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
      setText(this.sidebarToggle, collapsed ? 'Show' : 'Hide');
      window.setTimeout(() => this.map?.resize?.(), 180);
    });
  }

  bindModes() {
    this.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.modeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
        document.body.classList.toggle('is-explore-flow', button.dataset.flow === 'explore');
      });
    });
  }

  bindCityButtons() {
    this.cityButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const city = button.dataset.city;
        if (city) this.map?.loadCity?.(city);
      });
    });
  }

  bindBackButton() {
    this.backButton?.addEventListener('click', () => {
      const view = this.map?.getCurrentView?.();
      if (!view || view.level === 'overview') return;

      if (view.level === 'tradeArea' && view.city) {
        this.map.loadCity(view.city);
      } else if (view.level === 'city' && view.country) {
        this.map.loadCountry(view.country);
      } else {
        this.map.loadOverview();
      }
    });
  }

  bindDialogs() {
    document.querySelectorAll('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById(button.dataset.dialogClose)?.close();
      });
    });

    this.leadOpen?.addEventListener('click', () => this.openLeadDialog());
  }

  bindLeadForm() {
    this.leadForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fields = getFormFields(this.leadForm);
      const validation = validateLeadFields(fields);

      if (!validation.valid || !this.leadForm.reportValidity()) {
        setText(this.leadStatus, validation.emailValid ? 'Complete all fields.' : 'Enter a valid email address.');
        return;
      }

      const submitButton = this.leadForm.querySelector('button[type="submit"]');
      submitButton?.setAttribute('disabled', 'true');
      setText(this.leadStatus, 'Sending...');

      try {
        const response = await fetch(this.leadForm.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(this.leadForm)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success !== true) {
          throw new Error('lead-submit-failed');
        }

        setText(this.leadStatus, 'Message sent.');
        window.setTimeout(() => this.leadDialog?.close(), 900);
      } catch (error) {
        console.error('Warm lead submission failed.', error);
        setText(this.leadStatus, 'Unable to send right now. Please try again.');
      } finally {
        submitButton?.removeAttribute('disabled');
      }
    });
  }

  openLeadDialog() {
    if (this.leadSourceUrl) this.leadSourceUrl.value = window.location.href;
    if (this.leadMatchContext) this.leadMatchContext.value = getLeadContext(this.filters?.lastResults);
    setText(this.leadStatus, '');
    this.leadDialog?.showModal();
  }

  updateBreadcrumb(view = {}) {
    if (!this.breadcrumbList) return;

    const items = ['Overview'];
    if (view.country) items.push(view.country);
    if (view.city) items.push(view.city);
    if (view.tradeArea) items.push(view.tradeArea);

    const nodes = items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    });
    this.breadcrumbList.replaceChildren(...nodes);

    if (this.backButton) {
      this.backButton.disabled = view.level === 'overview' || !view.level;
    }
  }

  renderLegend() {
    if (!this.legend) return;

    const entries = [
      ['#E53935', 'Central Business District'],
      ['#FF9800', 'Peripheral Business District'],
      ['#2196F3', 'Tertiary Business District'],
      ['#9C27B0', 'Nightlife'],
      ['#424242', 'Mall catchment']
    ];

    const title = document.createElement('p');
    title.className = 'intel-eyebrow';
    title.textContent = 'TAT Legend';

    const list = document.createElement('ul');
    entries.forEach(([color, label]) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.style.background = color;
      item.append(swatch, document.createTextNode(label));
      list.append(item);
    });

    this.legend.replaceChildren(title, list);
  }
}

export default UIController;
