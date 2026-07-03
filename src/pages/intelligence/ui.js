import { geoData, tradeData } from '../../data/geoData.js';
import properties from '../../data/properties.json';
import { loadProfile } from './wizard.js';

export function validateLeadFields(fields = {}) {
  const required = ['name', 'brand', 'phone', 'email'];
  const missing = required.filter((key) => !String(fields[key] || '').trim());
  const email = String(fields.email || '').trim();
  const phone = phoneDigits(fields.phone);
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneFormatValid = !phone || (phone.length >= 7 && phone.length <= 15);

  return {
    valid: missing.length === 0 && emailValid && phoneFormatValid,
    missing,
    emailValid,
    phoneFormatValid
  };
}

function phoneDigits(value) {
  return String(value || '').replace(/\D+/g, '').slice(0, 15);
}

export function getLeadContext(results) {
  if (!results) return '';
  return JSON.stringify({
    query: results.query,
    propertyCount: results.properties.length,
    tradeAreaIds: results.tradeAreaIds
  });
}

export async function submitLeadData({ action, fields, formData }, fetchImpl = fetch) {
  const validation = validateLeadFields(fields);
  if (!validation.valid) {
    return { ok: false, reason: 'validation', validation };
  }

  const response = await fetchImpl(action, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success !== true) {
    return { ok: false, reason: 'request-failed', payload };
  }

  return { ok: true, payload };
}

function setText(node, value) {
  if (node) node.textContent = String(value || '');
}

function getFormFields(form) {
  const data = new FormData(form);
  return {
    name: data.get('name'),
    brand: data.get('brand'),
    phone: phoneDigits(data.get('phone')),
    email: data.get('email')
  };
}

export class UIController {
  constructor(options = {}) {
    this.map = options.map || null;
    this.filters = options.filters || null;
    this.sidebar = options.sidebar || null;
    this.cityButtonsContainer = document.getElementById('city-buttons');
    this.globalToggle = document.getElementById('global-toggle');
    this.backButton = document.getElementById('back-button');
    this.flow = options.flow || null;
    this.flowPrompt = document.getElementById('flow-prompt');
    this.flowPromptText = document.getElementById('flow-prompt-text');
    this.runIntel = document.getElementById('run-intel');
    this.breadcrumbList = document.getElementById('breadcrumb-list');
    this.legend = document.getElementById('legend');
    this.leadDialog = document.getElementById('lead-modal');
    this.leadForm = document.getElementById('warm-lead-form');
    this.leadOpens = document.querySelectorAll('.js-lead-open');
    this.leadStatus = document.getElementById('warm-lead-status');
    this.leadSourceUrl = document.getElementById('warm-source-url');
    this.leadMatchContext = document.getElementById('warm-match-context');
    this.earlyAccessCheckbox = document.getElementById('lead-early-access');
    this.earlyAccessValue = document.getElementById('lead-early-access-value');
  }

  init() {
    this.renderCitySwitcher();
    this.bindBackButton();
    this.bindGlobalToggle();
    this.bindFlowControls();
    this.bindDialogs();
    this.bindLeadSlides();
    this.bindLeadForm();
    this.bindPhoneFormatting();
    this.bindSpotlight();
    this.renderLegend();
    this.updateBreadcrumb(this.map?.getCurrentView?.() || { level: 'overview' });
    return this;
  }

  countryList() {
    return [...new Set((geoData.cities?.features || []).map((f) => f.properties?.country).filter(Boolean))].sort();
  }

  citiesInCountry(country) {
    return (geoData.cities?.features || [])
      .filter((f) => f.properties?.country === country)
      .map((f) => f.properties.name)
      .sort();
  }

  // Bottom switcher: a country selector + the cities within that country.
  renderCitySwitcher(country, activeCity) {
    if (!this.cityButtonsContainer) return;
    const target = country || this.countryList()[0];

    if (this._switcherCountry !== target) {
      this._switcherCountry = target;

      // Country selector with pop-up menu
      const wrap = document.createElement('div');
      wrap.className = 'intel-country-select';

      const menu = document.createElement('div');
      menu.className = 'intel-country-menu';
      menu.hidden = true;
      this.countryList().forEach((c) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'intel-country-option';
        opt.textContent = c;
        if (c === target) opt.classList.add('is-active');
        opt.addEventListener('click', () => {
          menu.hidden = true;
          this.navigateOrPrompt(() => { this.sidebar?.hideAll?.(); this.map?.loadCountry?.(c); }, c);
        });
        menu.append(opt);
      });

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'intel-country-pill';
      pill.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>${target}</span>`;
      pill.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
      document.addEventListener('click', () => { menu.hidden = true; });

      wrap.append(menu, pill);

      const divider = document.createElement('span');
      divider.className = 'intel-switcher-divider';

      // City selector as a pop-up menu (mirrors the country selector) so the
      // bar stays compact no matter how many cities exist.
      const cityWrap = document.createElement('div');
      cityWrap.className = 'intel-country-select intel-city-select';

      const cityMenu = document.createElement('div');
      cityMenu.className = 'intel-country-menu';
      cityMenu.hidden = true;
      this.citiesInCountry(target).forEach((city) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'intel-country-option';
        opt.dataset.city = city;
        opt.textContent = city;
        opt.addEventListener('click', () => {
          cityMenu.hidden = true;
          this.navigateOrPrompt(() => { this.sidebar?.hideAll?.(); this.map?.loadCity?.(city); }, city);
        });
        cityMenu.append(opt);
      });

      const cityPill = document.createElement('button');
      cityPill.type = 'button';
      cityPill.className = 'intel-country-pill intel-city-pill';
      cityPill.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span class="intel-city-pill__label">Select city</span>`;
      cityPill.addEventListener('click', (e) => { e.stopPropagation(); cityMenu.hidden = !cityMenu.hidden; });
      document.addEventListener('click', () => { cityMenu.hidden = true; });

      cityWrap.append(cityMenu, cityPill);
      this._cityPillLabel = cityPill.querySelector('.intel-city-pill__label');
      this._cityMenu = cityMenu;

      this.cityButtonsContainer.replaceChildren(wrap, divider, cityWrap);
    }

    if (this._cityPillLabel) this._cityPillLabel.textContent = activeCity || 'Select city';
    this._cityMenu?.querySelectorAll('.intel-country-option').forEach((o) => {
      o.classList.toggle('is-active', o.dataset.city === activeCity);
    });
  }

  bindBackButton() {
    this.backButton?.addEventListener('click', () => {
      const view = this.map?.getCurrentView?.();
      if (!view) return;

      // In the tailored funnel, "back" returns to the matches — never silently to free mode.
      if (this.sidebar?.tailoredMode) {
        this.sidebar.backToMatches();
        return;
      }

      this.sidebar?.hideAll?.();
      // Country is the top-level user view; global is reached only via the Overview crumb.
      if (view.level === 'tradeArea' && view.city) {
        this.map.loadCity(view.city);
      } else if (view.level === 'city' && view.country) {
        this.map.loadCountry(view.country);
      } else if (view.level === 'overview') {
        this.map.loadCountry(view.country || 'India');
      }
    });
  }

  bindGlobalToggle() {
    this.globalToggle?.addEventListener('click', () => {
      const view = this.map?.getCurrentView?.();
      if (view?.level === 'overview') {
        this.map?.loadCountry?.(this._switcherCountry || 'India');
      } else {
        this.map?.showGlobal?.();
      }
    });
  }

  bindFlowControls() {
    this.runIntel?.addEventListener('click', () => this.flow?.startMatch?.());
    document.getElementById('flow-prompt-free')?.addEventListener('click', () => {
      this.hideFlowPrompt();
      this.flow?.enterFreeExplore?.();   // reset filters + clear highlighted pins
      if (this._pendingNav) this._pendingNav();   // then go where they clicked
      this._pendingNav = null;
    });
    document.getElementById('flow-prompt-refine')?.addEventListener('click', () => {
      this.cancelFlowPrompt();
      this.flow?.reopenWizard?.();
    });
    document.getElementById('flow-prompt-close')?.addEventListener('click', () => this.cancelFlowPrompt());
  }

  // Run nav directly, or — if the user is in a tailored funnel — ask first.
  navigateOrPrompt(action, label) {
    if (this.sidebar?.tailoredMode) {
      this._pendingNav = action;
      if (this.flowPromptText && label) {
        this.flowPromptText.textContent = `Leave your tailored matches and free-explore ${label}?`;
      }
      this.flowPrompt?.removeAttribute('hidden');
      // Click anywhere outside the prompt dismisses it (stay in match mode).
      setTimeout(() => {
        this._dismissPrompt = (e) => { if (!this.flowPrompt.contains(e.target)) this.cancelFlowPrompt(); };
        document.addEventListener('click', this._dismissPrompt);
      }, 0);
    } else {
      action();
    }
  }

  hideFlowPrompt() {
    this.flowPrompt?.setAttribute('hidden', '');
    if (this._dismissPrompt) { document.removeEventListener('click', this._dismissPrompt); this._dismissPrompt = null; }
  }

  cancelFlowPrompt() {
    this.hideFlowPrompt();
    this._pendingNav = null;
  }

  bindDialogs() {
    document.querySelectorAll('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById(button.dataset.dialogClose)?.close();
      });
    });

    this.leadOpens?.forEach((btn) => btn.addEventListener('click', () => this.openLeadDialog()));
  }

  bindLeadSlides() {
    this._leadSlide = 1;
    this.leadForm?.querySelectorAll('[data-lead-next]').forEach((b) => b.addEventListener('click', () => this.leadNext()));
    this.leadForm?.querySelectorAll('[data-lead-back]').forEach((b) => b.addEventListener('click', () => this.goLeadSlide(this._leadSlide - 1)));
    document.querySelectorAll('#lead-customers .lead-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('is-selected');
        const sel = [...document.querySelectorAll('#lead-customers .lead-chip.is-selected')].map((c) => c.dataset.value);
        const hidden = document.getElementById('lead-primary-customers');
        if (hidden) hidden.value = sel.join(', ');
        this.revealLeadStep(3); // reveal stores/areas/comments once they pick a customer type
      });
    });
    // Progressive disclosure — reveal the next question as the previous is answered.
    document.getElementById('lead-years')?.addEventListener('change', (e) => {
      if (e.target.value) this.revealLeadStep(2);
    });
  }

  // ---- Spotlight card (free-explore country/city) ----------------------
  bindSpotlight() {
    this.spotlightCard = document.getElementById('spotlight-card');
    document.getElementById('spot-cta')?.addEventListener('click', () => this.openSpotlightProperty());
    this.spotlightCard?.addEventListener('mouseenter', () => clearInterval(this._spotTimer));
    this.spotlightCard?.addEventListener('mouseleave', () => this._spotResume());
  }

  refreshSpotlight(view = {}) {
    if (!this.spotlightCard) return;
    const free = !this.sidebar?.tailoredMode && document.body.dataset.flow !== 'wizard';
    let props = [];
    if (free && view.level === 'city' && view.city) {
      props = properties.filter((p) => p.city === view.city);
    } else if (free && view.level === 'country' && view.country) {
      const cities = new Set(geoData.cities.features.filter((c) => c.properties.country === view.country).map((c) => c.properties.name));
      props = properties.filter((p) => cities.has(p.city));
    }
    clearInterval(this._spotTimer);
    if (!props.length) { this.spotlightCard.hidden = true; return; }
    this._spotProps = props.slice().sort(() => Math.random() - 0.5);
    this._spotIdx = 0;
    this.spotlightCard.hidden = false;
    this.showSpotlightItem();
    this._spotResume();
  }

  _spotResume() {
    if (!this._spotProps?.length || this.spotlightCard?.hidden) return;
    clearInterval(this._spotTimer);
    this._spotTimer = setInterval(() => {
      this._spotIdx = (this._spotIdx + 1) % this._spotProps.length;
      this.showSpotlightItem();
    }, 5000);
  }

  showSpotlightItem() {
    const p = this._spotProps?.[this._spotIdx];
    if (!p) return;
    this._spotProperty = p;
    const data = tradeData[p.tradeArea] || {};
    this.spotlightCard?.classList.remove('is-changing');
    void this.spotlightCard?.offsetWidth;
    this.spotlightCard?.classList.add('is-changing');
    setText(document.getElementById('spot-name'), p.name);
    setText(document.getElementById('spot-loc'), [p.tradeAreaName, p.city].filter(Boolean).join(', '));
    setText(document.getElementById('spot-size'), p.sizeLabel || (p.size ? `${p.size} sq.ft` : '--'));
    setText(document.getElementById('spot-rent'), p.priceLabel || (p.price ? `${p.price}/sq.ft` : '--'));
    setText(document.getElementById('spot-floor'), p.floor || p.status || '--');
    setText(document.getElementById('spot-footfall'), data.stats?.footfall || '--');
    const chips = document.getElementById('spot-chips');
    if (chips) {
      const labels = { fb: 'F&B', retail: 'Retail', fashion: 'Fashion', wellness: 'Wellness', lifestyle: 'Lifestyle', electronics: 'Electronics' };
      chips.replaceChildren(...(p.suitableFor || []).slice(0, 3).map((c) => {
        const s = document.createElement('span');
        s.className = 'intel-spotlight__chip';
        s.textContent = labels[c] || c;
        return s;
      }));
    }
  }

  openSpotlightProperty() {
    const p = this._spotProperty;
    if (!p) return;
    this.sidebar?.hideAll?.();
    this.map?.loadTradeArea?.(p.tradeArea);
    this.sidebar?.openPropertyDetail?.(p, () => this.sidebar.renderProperties(this.sidebar.currentAreaProperties));
  }

  revealLeadStep(n) {
    const el = this.leadForm?.querySelector(`.lead-reveal[data-reveal="${n}"]`);
    if (el && el.hasAttribute('hidden')) el.removeAttribute('hidden');
  }

  goLeadSlide(n) {
    this._leadSlide = n;
    this.leadForm?.querySelectorAll('.lead-slide').forEach((s) => {
      const sn = Number(s.dataset.leadSlide);
      s.hidden = sn !== n;
      s.classList.toggle('is-active', sn === n);
    });
    const prog = document.getElementById('lead-progress');
    if (prog) {
      prog.hidden = n === 4;
      prog.querySelectorAll('.lead-dot').forEach((d, i) => d.classList.toggle('is-active', i < Math.min(n, 3)));
    }
    setText(this.leadStatus, '');
  }

  leadNext() {
    if (this._leadSlide === 1) { this.goLeadSlide(2); return; }
    if (this._leadSlide === 2) {
      const v = validateLeadFields(getFormFields(this.leadForm));
      if (!v.valid) {
        setText(this.leadStatus, this.leadValidationMessage(v));
        return;
      }
      this.goLeadSlide(3);
    }
  }

  bindPhoneFormatting() {
    const phoneInput = document.getElementById('lead-phone');
    phoneInput?.addEventListener('input', () => {
      phoneInput.value = phoneDigits(phoneInput.value).slice(0, 15);
    });
    this.earlyAccessCheckbox?.addEventListener('change', () => {
      if (this.earlyAccessValue) this.earlyAccessValue.value = this.earlyAccessCheckbox.checked ? 'Yes' : 'No';
    });
  }

  leadValidationMessage(validation) {
    if (!validation.emailValid) return 'Enter a valid email address.';
    if (!validation.phoneFormatValid) return 'Enter a valid mobile number.';
    return 'Please complete name, brand, email and mobile.';
  }

  bindLeadForm() {
    this.leadForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fields = getFormFields(this.leadForm);
      const phoneInput = this.leadForm.elements?.phone;
      if (phoneInput) phoneInput.value = fields.phone;
      if (this.earlyAccessValue) this.earlyAccessValue.value = this.earlyAccessCheckbox?.checked ? 'Yes' : 'No';
      const validation = validateLeadFields(fields);
      if (!validation.valid) {
        this.goLeadSlide(2);
        setText(this.leadStatus, this.leadValidationMessage(validation));
        return;
      }

      const submitButton = this.leadForm.querySelector('button[type="submit"]');
      submitButton?.setAttribute('disabled', 'true');
      setText(this.leadStatus, 'Sending…');

      try {
        const result = await submitLeadData({ action: this.leadForm.action, fields, formData: new FormData(this.leadForm) });
        if (!result.ok) throw new Error('lead-submit-failed');
        const who = (fields.name || '').trim();
        const doneMsg = document.getElementById('lead-done-msg');
        if (doneMsg && who) doneMsg.textContent = `Thanks ${who} — our team is already looking into your requirements and will reach out shortly with curated trade areas and properties.`;
        this.goLeadSlide(4);
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

    // Capture as much context as we can for the team (profile, filters, view, area seen).
    const profile = loadProfile();
    const tailored = window.foottfallIntelligence?.tailoredResults;
    const view = this.map?.getCurrentView?.() || {};
    const context = {
      profile,
      view: { country: view.country, city: view.city, tradeArea: view.tradeArea },
      query: tailored?.query || this.filters?.lastResults?.query || null,
      matchedProperties: tailored?.properties?.length ?? null,
      tradeAreaIds: tailored?.tradeAreaIds || null,
      timestamp: new Date().toISOString()
    };
    if (this.leadMatchContext) this.leadMatchContext.value = JSON.stringify(context);

    if (this.leadForm && profile) {
      [['name', profile.name], ['brand', profile.brand], ['phone', profile.phone], ['email', profile.email]]
        .forEach(([field, val]) => {
          const input = this.leadForm.elements?.[field];
          if (input && val && !input.value) input.value = val;
        });
    }
    // Fresh progressive-reveal state each open.
    this.leadForm?.querySelectorAll('.lead-reveal').forEach((el) => el.setAttribute('hidden', ''));
    document.getElementById('lead-submit')?.removeAttribute('hidden');
    if (this.earlyAccessCheckbox) this.earlyAccessCheckbox.checked = false;
    if (this.earlyAccessValue) this.earlyAccessValue.value = 'No';
    this.goLeadSlide(1);
    this.leadDialog?.showModal();
  }

  updateBreadcrumb(view = {}) {
    if (!this.breadcrumbList) return;

    // Global view is reached via the discrete side toggle, not the breadcrumb.
    const items = [];
    if (view.level === 'overview') {
      items.push({ label: 'Global', action: null });
    } else {
      if (view.country) items.push({ label: view.country, action: () => this.navigateOrPrompt(() => { this.sidebar?.hideAll?.(); this.map?.loadCountry?.(view.country); }, view.country) });
      if (view.city) items.push({ label: view.city, action: () => this.navigateOrPrompt(() => { this.sidebar?.hideAll?.(); this.map?.loadCity?.(view.city); }, view.city) });
      if (view.tradeArea) items.push({ label: view.tradeArea, action: null });
    }

    const nodes = items.map(({ label, action }, index) => {
      const li = document.createElement('li');
      const isLast = index === items.length - 1;
      if (action && !isLast) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'intel-crumb';
        btn.textContent = label;
        btn.addEventListener('click', action);
        li.append(btn);
      } else {
        li.textContent = label;
      }
      return li;
    });
    this.breadcrumbList.replaceChildren(...nodes);

    if (this.backButton) {
      this.backButton.disabled = view.level === 'overview' || view.level === 'country' || !view.level;
    }

    // Legend auto-expands in city view (where tiers matter most), collapses elsewhere.
    if (this.legend) this.legend.classList.toggle('is-open', view.level === 'city');
    if (this.globalToggle) this.globalToggle.classList.toggle('is-active', view.level === 'overview');

    this.renderCitySwitcher(view.country, view.city || null);
    this.refreshSpotlight(view);
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
    title.textContent = 'Tier Legend';

    const list = document.createElement('ul');
    entries.forEach(([color, label]) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.style.background = color;
      item.append(swatch, document.createTextNode(label));
      list.append(item);
    });

    this.legend.replaceChildren(title, list);
    title.addEventListener('click', () => this.legend.classList.toggle('is-open'));
  }
}

export default UIController;
