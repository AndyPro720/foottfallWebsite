import { geoData } from '../../data/geoData.js';
import { matchProperties } from './filters.js';

// Friendly wizard categories → underlying data tokens used for matching.
const CATEGORY_TOKENS = {
  food: ['fb'],
  hospitality: ['fb', 'lifestyle'],
  fashion: ['fashion'],
  wellness: ['wellness'],
  fitness: ['wellness', 'lifestyle'],
  gaming: ['lifestyle', 'electronics'],
  healthcare: ['wellness'],
  workspaces: ['lifestyle', 'retail'],
  hotels: ['lifestyle']
};

// Spend tiers normalized per country (label + numeric range matched against trade-area data).
const SPEND_TIERS = {
  India: {
    symbol: '₹',
    tiers: [
      { value: '<1000', label: 'Under 1,000', range: [0, 999] },
      { value: '1000-3000', label: '1,000–3,000', range: [1000, 3000] },
      { value: '3000-5000', label: '3,000–5,000', range: [3000, 5000] },
      { value: '5000+', label: '5,000+', range: [5000, Infinity] }
    ]
  },
  UAE: {
    symbol: 'AED',
    tiers: [
      { value: '<75', label: 'Under 75', range: [0, 74] },
      { value: '75-200', label: '75–200', range: [75, 200] },
      { value: '200-400', label: '200–400', range: [200, 400] },
      { value: '400+', label: '400+', range: [400, Infinity] }
    ]
  }
};

const PROFILE_KEY = 'foottfall_profile';

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch { /* storage unavailable */ }
}

export class WizardController {
  constructor(options = {}) {
    this.map = options.map || null;
    this.sidebar = options.sidebar || null;
    this.flow = options.flow || null;
    this.onComplete = options.onComplete || (() => {});

    this.root = document.getElementById('wizard-overlay');
    this.panel = this.root?.querySelector('.intel-wizard-panel');
    this.heading = this.panel?.querySelector('.intel-wizard__header h2');
    this.backBtn = document.getElementById('wizard-back');
    this.nextBtn = document.getElementById('wizard-next');
    this.finishBtn = document.getElementById('wizard-finish');
    this.skipBtn = document.getElementById('wizard-skip');

    this.countryContainer = document.getElementById('wizard-countries');
    this.cityContainer = document.getElementById('wizard-cities');
    this.citySection = document.getElementById('wizard-city-section');
    this.personalSection = document.getElementById('wizard-personal');
    this.categoryContainer = document.getElementById('wizard-categories');
    this.sizeContainer = document.getElementById('wizard-sizes');
    this.spendContainer = document.getElementById('wizard-spend');
    this.summaryEl = document.getElementById('wizard-results-summary');

    this.nameInput = document.getElementById('wizard-name');
    this.brandInput = document.getElementById('wizard-brand');
    this.emailInput = document.getElementById('wizard-email');
    this.phoneInput = document.getElementById('wizard-phone');

    this.state = this.blankState();
  }

  blankState() {
    return {
      step: 1,
      country: null,
      city: null,
      categories: [],
      size: null,
      spend: null,
      spendRange: null,
      profile: loadProfile()
    };
  }

  init() {
    if (!this.root) return this;
    this.renderCountries();
    this.bindEvents();
    this.prefillProfile();
    this.updateStepUI();
    return this;
  }

  getProfile() {
    return this.state.profile || {};
  }

  start() {
    this.reset();
    this.updateStepUI();
  }

  resumeRequirements() {
    this.state.step = this.state.city ? 2 : 1;
    if (this.state.categories.length) this.revealWStep('size', { scroll: false });
    if (this.state.size) this.revealWStep('spend', { scroll: false });
    this.updateStepUI();
  }

  reset() {
    const profile = this.state.profile || loadProfile();
    this.state = { ...this.blankState(), profile };
    this.cityContainer.replaceChildren();
    if (this.citySection) this.citySection.hidden = true;
    if (this.personalSection) this.personalSection.hidden = true;
    this.clearSelectionsIn(this.countryContainer);
    this.clearSelectionsIn(this.categoryContainer);
    this.clearSelectionsIn(this.sizeContainer);
    if (this.spendContainer) this.spendContainer.replaceChildren();
    this.panel?.querySelectorAll('.wizard-reveal').forEach((el) => el.setAttribute('hidden', ''));
  }

  bindEvents() {
    this.nextBtn?.addEventListener('click', () => this.goNext());
    this.backBtn?.addEventListener('click', () => this.goBack());
    this.finishBtn?.addEventListener('click', () => this.finish());
    this.skipBtn?.addEventListener('click', () => this.skipToExplore());

    this.categoryContainer?.querySelectorAll('.wizard-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('is-selected');
        this.state.categories = Array.from(this.categoryContainer.querySelectorAll('.wizard-chip.is-selected'))
          .map((el) => el.dataset.value);
        if (this.state.categories.length) this.revealWStep('size');
        this.updateNextEnabled();
      });
    });

    this.bindRadioGroup(this.sizeContainer, (value) => { this.state.size = value; this.revealWStep('spend'); });

    // profile inputs — optional, persisted live
    [['name', this.nameInput], ['brand', this.brandInput], ['email', this.emailInput], ['phone', this.phoneInput]]
      .forEach(([key, el]) => {
        el?.addEventListener('input', () => {
          if (key === 'phone') el.value = this.phoneDigits(el.value);
          this.state.profile = { ...this.state.profile, [key]: el.value.trim() };
          saveProfile(this.state.profile);
          if (key === 'name') this.updateHeading();
        });
      });
  }

  updateHeading() {
    if (!this.heading) return;
    const name = (this.state.profile?.name || '').trim();
    this.heading.textContent = name ? `Find Where You Belong, ${name}` : 'Find Where You Belong';
  }

  prefillProfile() {
    const p = this.state.profile || {};
    if (this.nameInput && p.name) this.nameInput.value = p.name;
    if (this.brandInput && p.brand) this.brandInput.value = p.brand;
    if (this.emailInput && p.email) this.emailInput.value = p.email;
    if (this.phoneInput && p.phone) this.phoneInput.value = p.phone;
    this.updateHeading();
  }

  bindRadioGroup(container, onSelect) {
    container?.querySelectorAll('.wizard-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.wizard-option').forEach((o) => o.classList.remove('is-selected'));
        opt.classList.add('is-selected');
        onSelect(opt.dataset.value);
        this.updateNextEnabled();
      });
    });
  }

  buildSpendOptions(country) {
    if (!this.spendContainer) return;
    const config = SPEND_TIERS[country] || SPEND_TIERS.India;
    this.state.spend = null;
    this.state.spendRange = null;
    this.spendContainer.replaceChildren(
      ...config.tiers.map((tier) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wizard-option';
        btn.dataset.value = tier.value;
        btn.innerHTML = `<span class="wizard-currency">${config.symbol}</span> ${tier.label}`;
        btn.addEventListener('click', () => {
          this.spendContainer.querySelectorAll('.wizard-option').forEach((o) => o.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          this.state.spend = tier.value;
          this.state.spendRange = tier.range;
          this.updateNextEnabled();
        });
        return btn;
      })
    );
  }

  renderCountries() {
    if (!this.countryContainer) return;
    const countries = [...new Set((geoData.cities?.features || []).map((f) => f.properties?.country).filter(Boolean))].sort();
    this.countryContainer.replaceChildren(
      ...countries.map((country) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'wizard-card';
        card.dataset.country = country;
        card.textContent = country;
        card.addEventListener('click', () => this.selectCountry(country, card));
        return card;
      })
    );
  }

  selectCountry(country, cardEl) {
    this.state.country = country;
    this.state.city = null;
    this.clearSelectionsIn(this.countryContainer);
    cardEl.classList.add('is-selected');
    this.renderCities(country);
    if (this.citySection) this.citySection.hidden = false;
    this.buildSpendOptions(country);
    this.updateNextEnabled();
  }

  renderCities(country) {
    if (!this.cityContainer) return;
    const cities = (geoData.cities?.features || [])
      .filter((f) => f.properties?.country === country)
      .map((f) => f.properties.name)
      .sort();
    this.cityContainer.replaceChildren(
      ...cities.map((city) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'wizard-card';
        card.dataset.city = city;
        card.textContent = city;
        card.addEventListener('click', () => this.selectCity(city, card));
        return card;
      })
    );
  }

  selectCity(city, cardEl) {
    this.state.city = city;
    this.clearSelectionsIn(this.cityContainer);
    cardEl.classList.add('is-selected');
    if (this.personalSection) this.personalSection.hidden = false;
    this.map?.loadCity?.(city);
    this.updateNextEnabled();
  }

  clearSelectionsIn(container) {
    container?.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
  }

  revealWStep(name, { scroll = true } = {}) {
    const section = this.panel?.querySelector(`.wizard-reveal[data-wreveal="${name}"]`);
    if (!section) return;
    const wasHidden = section.hasAttribute('hidden');
    section.removeAttribute('hidden');
    if (scroll && wasHidden) {
      requestAnimationFrame(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  stepIncomplete() {
    if (this.state.step === 1) return !this.state.country || !this.state.city;
    if (this.state.step === 2) return !(this.state.categories.length && this.state.size && this.state.spend);
    return false;
  }

  updateNextEnabled() {
    // Button stays clickable so we can flag what's missing; it just looks inactive.
    this.nextBtn?.classList.toggle('is-incomplete', this.stepIncomplete());
  }

  flashError(elements) {
    elements.filter(Boolean).forEach((el) => {
      el.classList.add('is-error');
      setTimeout(() => el.classList.remove('is-error'), 1200);
    });
  }

  validEmail() {
    const email = (this.emailInput?.value || '').trim();
    if (!email) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  phoneDigits(value) {
    return String(value || '').replace(/\D+/g, '').slice(0, 15);
  }

  validPhone() {
    const phone = this.phoneDigits(this.phoneInput?.value);
    return !phone || (phone.length >= 7 && phone.length <= 15);
  }

  updateStepUI() {
    if (!this.panel) return;
    this.panel.dataset.step = String(this.state.step);
    document.body.dataset.wizardStep = String(this.state.step);

    this.panel.querySelectorAll('.wizard-step').forEach((step) => {
      const stepNum = Number(step.dataset.stepContent);
      step.hidden = stepNum !== this.state.step;
      step.classList.toggle('is-active', stepNum === this.state.step);
    });

    this.panel.querySelectorAll('.wizard-step-dot').forEach((dot) => {
      const dotNum = Number(dot.dataset.dot);
      dot.classList.toggle('is-active', dotNum === this.state.step);
      dot.classList.toggle('is-done', dotNum < this.state.step);
    });

    if (this.backBtn) this.backBtn.hidden = this.state.step === 1;

    const isResults = this.state.step === 3;
    if (this.nextBtn) {
      this.nextBtn.hidden = isResults;
      this.nextBtn.textContent = this.state.step === 2 ? 'Show Matches' : 'Next';
    }
    if (this.finishBtn) this.finishBtn.hidden = !isResults;

    this.updateNextEnabled();
  }

  goNext() {
    if (this.state.step === 1) {
      const missing = [];
      if (!this.state.country) missing.push(document.getElementById('wizard-country-section'));
      if (!this.state.city) missing.push(this.citySection);
      if (missing.length) { this.flashError(missing); return; }
      if (!this.validEmail()) { this.flashError([this.emailInput]); this.emailInput?.focus(); return; }
      if (!this.validPhone()) { this.flashError([this.phoneInput]); this.phoneInput?.focus(); return; }
      this.state.step = 2;
      this.updateStepUI();
    } else if (this.state.step === 2) {
      const missing = [];
      if (!this.state.categories.length) missing.push(this.categoryContainer?.closest('.wizard-field'));
      if (!this.state.size) missing.push(this.sizeContainer?.closest('.wizard-field'));
      if (!this.state.spend) missing.push(this.spendContainer?.closest('.wizard-field'));
      if (missing.length) { this.flashError(missing); return; }
      this.computeAndShowResults();
      this.state.step = 3;
      this.updateStepUI();
    }
  }

  goBack() {
    if (this.state.step > 1) {
      this.state.step -= 1;
      this.updateStepUI();
    }
  }

  // expand friendly categories to data tokens
  expandedCategories() {
    const tokens = new Set();
    this.state.categories.forEach((c) => (CATEGORY_TOKENS[c] || [c]).forEach((t) => tokens.add(t)));
    return [...tokens];
  }

  computeAndShowResults() {
    const query = {
      city: this.state.city,
      categories: this.expandedCategories(),
      size: this.state.size,
      spendRange: this.state.spendRange
    };
    this.lastResults = matchProperties(query);
    this.lastResults.profile = this.state.profile;
    this.lastResults.tailored = true;
    if (window.foottfallIntelligence) {
      window.foottfallIntelligence.tailoredResults = this.lastResults;
      window.foottfallIntelligence.profile = this.state.profile;
    }
    this.renderResultsSummary();
    this.map?.focusTradeAreas?.(this.lastResults.tradeAreaIds);
    this.sidebar?.renderMatches?.(this.lastResults);
  }

  renderResultsSummary() {
    if (!this.summaryEl || !this.lastResults) return;
    const count = this.lastResults.properties.length;
    const areaCount = this.lastResults.tradeAreaIds.length;
    const brand = (this.state.profile?.brand || '').trim();
    const name = (this.state.profile?.name || '').trim();

    const countEl = this.summaryEl.querySelector('.wizard-result-count');
    const metaEl = this.summaryEl.querySelector('.wizard-result-meta');
    const leadEl = this.summaryEl.querySelector('.wizard-result-lead');

    if (countEl) this.rollCount(countEl, count);
    if (leadEl) {
      const who = brand || name;
      leadEl.textContent = count
        ? (who ? `matches for ${who}` : 'matches')
        : 'no matches yet';
    }
    if (metaEl) {
      metaEl.innerHTML = count
        ? `across <span class="wizard-area-count">${areaCount}</span> trade area${areaCount === 1 ? '' : 's'} in ${this.state.city}`
        : `Try broadening your filters for ${this.state.city}.`;
    }
  }

  // Roulette-style count-up from 0 → target.
  rollCount(el, target) {
    if (this._countRaf) cancelAnimationFrame(this._countRaf);
    if (!target) { el.textContent = '0'; return; }
    const dur = 900;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(eased * target));
      if (t < 1) this._countRaf = requestAnimationFrame(step);
      else el.textContent = String(target);
    };
    el.textContent = '0';
    this._countRaf = requestAnimationFrame(step);
  }

  finish() {
    this.flow?.exitWizard?.();
  }

  skipToExplore() {
    const city = this.state.city || this.map?.getCurrentView?.()?.city;
    this.flow?.enterFreeExplore?.({ showCityAreas: Boolean(city), city });
  }
}

export default WizardController;
