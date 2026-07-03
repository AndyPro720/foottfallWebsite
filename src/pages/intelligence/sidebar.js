import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip
} from 'chart.js';
import { dataService } from './data-service.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const CATEGORY_LABELS = {
  fb: 'F&B',
  retail: 'Retail',
  fashion: 'Fashion',
  wellness: 'Wellness',
  lifestyle: 'Lifestyle',
  electronics: 'Electronics'
};

// Full-form trade-area classification (by tier colour), used everywhere — no abbreviations.
const TIER_CLASS = {
  '#E53935': 'Central Business District',
  '#FF9800': 'Peripheral Business District',
  '#2196F3': 'Tertiary Business District',
  '#9C27B0': 'Nightlife',
  '#424242': 'Mall Catchment'
};
const TIER_ORDER = [
  'Central Business District',
  'Peripheral Business District',
  'Tertiary Business District',
  'Nightlife',
  'Mall Catchment'
];

export function classifyArea(props = {}) {
  return TIER_CLASS[String(props.color || '').toUpperCase()] || 'Trade Area';
}

// Deterministic facility availability so each property reads consistently.
const FACILITY_KEYS = ['Parking Space', 'Outside Space', 'Service Entry', 'Lift Access', 'BOH Space', 'Fire Exit'];
function facilitiesFor(property) {
  const str = String(property.name || '') + String(property.size || '');
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return FACILITY_KEYS.map((label, i) => ({ label, yes: ((h >> i) & 1) === 1 }));
}

function text(value, fallback = '--') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeColor(value, fallback = 'var(--intel-green)') {
  const color = String(value || '').trim();
  return /^(#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\))$/i.test(color) ? color : fallback;
}

function firstNumber(value) {
  const match = text(value, '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function createPropertyCard(property) {
  const card = document.createElement('article');
  card.className = 'intel-property-card';

  const top = document.createElement('div');
  top.className = 'intel-property-card__top';

  const media = document.createElement('div');
  media.className = 'intel-property-card__media';
  media.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9l1.2-4.2A1 1 0 0 1 6.2 4h11.6a1 1 0 0 1 1 .8L20 9M5 9h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9zm0 0h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;

  const head = document.createElement('div');
  head.className = 'intel-property-card__head';
  const title = document.createElement('h4');
  title.textContent = text(property.name, 'Unnamed property');
  head.append(title);
  if (property.status) {
    const status = document.createElement('span');
    status.className = 'intel-property-card__status';
    status.textContent = property.status;
    head.append(status);
  }

  top.append(media, head);
  card.append(top);

  const fits = (property.suitableFor || []).slice(0, 4);
  if (fits.length) {
    const chips = document.createElement('div');
    chips.className = 'intel-property-card__chips';
    fits.forEach((c) => {
      const chip = document.createElement('span');
      chip.className = 'intel-fit-chip';
      chip.textContent = CATEGORY_LABELS[c] || c;
      chips.append(chip);
    });
    card.append(chips);
  }

  const sizeValue = property.sizeLabel || (property.size ? `${property.size} sq.ft` : '--');
  const meta = document.createElement('dl');
  meta.className = 'intel-property-card__meta';
  [
    ['Trade area', property.tradeAreaName],
    ['Size', sizeValue],
    ['Floor', property.floor]
  ].forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = text(value);
    meta.append(dt, dd);
  });
  card.append(meta);

  const cta = document.createElement('span');
  cta.className = 'intel-property-card__cta';
  cta.textContent = 'View details →';
  card.append(cta);

  return card;
}

export class SidebarController {
  constructor(options = {}) {
    this.onClose = options.onClose || (() => {});

    // Roots & panes
    this.leftRoot = document.getElementById('sidebar-left');
    this.rightRoot = document.getElementById('sidebar-right');
    this.leftIntel = document.getElementById('left-intel');
    this.leftMatches = document.getElementById('left-matches');
    this.leftCity = document.getElementById('left-city');
    this.cityEyebrow = document.getElementById('city-eyebrow');
    this.cityAreaList = document.getElementById('city-area-list');
    this.leftHandle = document.getElementById('left-handle');
    this.rightHandle = document.getElementById('right-handle');

    // Left intel header
    this.taTitle = document.getElementById('ta-title');
    this.taTier = document.getElementById('ta-tier');
    this.taBack = document.getElementById('ta-back');
    this.taBackLabel = document.getElementById('ta-back-label');
    this.flow = options.flow || null;

    // Matches
    this.matchTitle = document.getElementById('match-title');
    this.matchMeta = document.getElementById('match-meta');
    this.matchList = document.getElementById('match-list');

    // Right properties
    this.propertyList = document.getElementById('property-list');
    this.propertyCount = document.getElementById('property-count');
    this.propertiesTitle = document.getElementById('properties-title');
    this.rightListView = document.getElementById('right-list-view');
    this.propertyDetail = document.getElementById('property-detail');

    this.MAX_VISIBLE = 3;
    this.map = options.map || null;        // set post-construction in main
    this._detailReturn = null;

    // Demographics
    this.demoPopulation = document.getElementById('demo-population');
    this.demoGender = document.getElementById('demo-gender');
    this.demoAge = document.getElementById('demo-age');
    this.demoSegment = document.getElementById('demo-segment');
    this.demoFootfall = document.getElementById('demo-footfall');

    // Commercial
    this.commAvgRent = document.getElementById('comm-avg-rent');
    this.commRentBand = document.getElementById('comm-rent-band');
    this.commAvgSpend = document.getElementById('comm-avg-spend');
    this.commTotalUnits = document.getElementById('comm-total-units');
    this.commAnchors = document.getElementById('comm-anchors');

    // Brandscape
    this.brandChips = document.getElementById('brand-chips');
    this.saturationContainer = document.getElementById('saturation-container');

    // Floating stats card
    this.statsCard = document.getElementById('stats-card');
    this.statsTierDot = document.getElementById('stats-tier-dot');
    this.statsTierLabel = document.getElementById('stats-tier-label');
    this.statsTitle = document.getElementById('stats-title');
    this.statsCorridor = document.getElementById('stats-corridor');
    this.statsRent = document.getElementById('stats-rent');
    this.statsSpend = document.getElementById('stats-spend');
    this.statsUnits = document.getElementById('stats-units');

    this.chartCanvas = document.getElementById('stats-chart');
    this.chart = null;
    this.matchesActive = false;
  }

  init() {
    this.bindTabEvents();
    this.bindCollapse();
    this.bindMobileResize();
    this.clear();
    return this;
  }

  isMobileLayout() {
    return window.matchMedia?.('(max-width: 760px)').matches || false;
  }

  clearMobileStack() {
    this.leftRoot?.classList.remove('is-mobile-primary', 'is-mobile-peek');
    this.rightRoot?.classList.remove('is-mobile-primary', 'is-mobile-peek');
  }

  activateMobileSide(side) {
    this.recall(side);
    this.clearMobileStack();
    if (!this.isMobileLayout()) return;

    const primaryRoot = side === 'left' ? this.leftRoot : this.rightRoot;
    const secondaryRoot = side === 'left' ? this.rightRoot : this.leftRoot;
    primaryRoot?.classList.add('is-mobile-primary');
    if (secondaryRoot?.classList.contains('is-active') && !secondaryRoot.classList.contains('is-collapsed')) {
      secondaryRoot.classList.add('is-mobile-peek');
    }
  }

  bindMobileResize() {
    [this.leftRoot, this.rightRoot].filter(Boolean).forEach((root) => {
      root.addEventListener('pointerdown', (event) => this.startMobileResize(event, root));
    });
  }

  startMobileResize(event, root) {
    if (!this.isMobileLayout() || root.classList.contains('is-mobile-peek')) return;
    if (event.target.closest('button, a, input, select, textarea')) return;

    const rect = root.getBoundingClientRect();
    const header = event.target.closest('.intel-sidebar__header');
    const onGrabber = event.clientY - rect.top <= 24;
    if (!header && !onGrabber) return;

    event.preventDefault();

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const minHeight = Math.max(220, viewportHeight * 0.3);
    const maxHeight = Math.max(minHeight, viewportHeight * 0.78);
    const startY = event.clientY;
    const startHeight = root.getBoundingClientRect().height;
    let moved = false;

    const onMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      if (Math.abs(delta) > 4) moved = true;
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
      document.documentElement.style.setProperty('--intel-mobile-sidebar-h', `${Math.round(nextHeight)}px`);
      document.body.classList.add('is-resizing-sidebar');
    };

    const onEnd = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      document.body.classList.remove('is-resizing-sidebar');
      if (moved) this._suppressPeekTap = true;
      setTimeout(() => { this._suppressPeekTap = false; }, 0);
    };

    root.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd, { once: true });
    window.addEventListener('pointercancel', onEnd, { once: true });
  }

  // ---- visibility modes -------------------------------------------------
  showTradeArea() {
    this.matchesActive = false;
    if (this.leftIntel) this.leftIntel.hidden = false;
    if (this.leftMatches) this.leftMatches.hidden = true;
    if (this.leftCity) this.leftCity.hidden = true;
    this.recall('left');
    this.recall('right');
    this.leftRoot?.classList.add('is-active');
    this.rightRoot?.classList.add('is-active');
    this.activateMobileSide('right');
  }

  showMatches() {
    this.matchesActive = true;
    if (this.leftIntel) this.leftIntel.hidden = true;
    if (this.leftMatches) this.leftMatches.hidden = false;
    if (this.leftCity) this.leftCity.hidden = true;
    this.recall('left');
    this.leftRoot?.classList.add('is-active');
    this.rightRoot?.classList.remove('is-active');
    this.activateMobileSide('left');
    this.hideStatsCard();
  }

  // City view: tier-grouped list of trade areas (a nav alternative to the map).
  showCityAreas(cityName) {
    const areas = this.map?.getTradeAreasByCity?.(cityName) || [];
    if (!this.leftCity) return;
    if (this.cityEyebrow) this.cityEyebrow.textContent = cityName;
    this.renderCityAreas(areas);
    if (this.leftIntel) this.leftIntel.hidden = true;
    if (this.leftMatches) this.leftMatches.hidden = true;
    this.leftCity.hidden = false;
    this.recall('left');
    this.leftRoot?.classList.add('is-active');
    this.rightRoot?.classList.remove('is-active');
    this.activateMobileSide('left');
    this.hideStatsCard();
  }

  renderCityAreas(areas) {
    if (!this.cityAreaList) return;
    // Group by full-form classification (CBD / PBD / Tertiary / Nightlife / Mall).
    const groups = new Map();
    areas.forEach((f) => {
      const cls = classifyArea(f.properties || {});
      if (!groups.has(cls)) groups.set(cls, []);
      groups.get(cls).push(f);
    });
    const order = TIER_ORDER.filter((t) => groups.has(t));
    const frag = document.createDocumentFragment();
    order.forEach((cls) => {
      const heading = document.createElement('p');
      heading.className = 'intel-tier-heading';
      heading.textContent = cls;
      frag.append(heading);
      groups.get(cls).forEach((f) => {
        const p = f.properties || {};
        const count = dataService.getPropertiesForTradeArea(p.id).length;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'intel-tier-item';
        item.innerHTML = `
          <span class="intel-tier-dot" style="background:${safeColor(p.color)}"></span>
          <span class="intel-tier-name">${escapeHtml(p.name || 'Trade area')}</span>
          <span class="intel-tier-count">${count}</span>`;
        item.addEventListener('click', () => this.map?.loadTradeArea?.(p.id));
        frag.append(item);
      });
    });
    this.cityAreaList.replaceChildren(frag);
  }

  hideAll() {
    this.matchesActive = false;
    this.tailoredMode = false;
    document.body.dataset.tailored = 'false';
    this.tailoredByArea = null;
    this.leftRoot?.classList.remove('is-active');
    this.rightRoot?.classList.remove('is-active');
    this.leftRoot?.classList.remove('is-collapsed');
    this.rightRoot?.classList.remove('is-collapsed');
    this.clearMobileStack();
    if (this.leftHandle) this.leftHandle.hidden = true;
    if (this.rightHandle) this.rightHandle.hidden = true;
    this.hideStatsCard();
  }

  // backwards-compatible alias used by flow controller
  hide() {
    this.hideAll();
  }

  // ---- collapse / recall ------------------------------------------------
  bindCollapse() {
    document.querySelectorAll('[data-collapse]').forEach((btn) => {
      btn.addEventListener('click', () => this.collapse(btn.dataset.collapse));
    });
    this.leftHandle?.addEventListener('click', () => this.activateMobileSide('left'));
    this.rightHandle?.addEventListener('click', () => this.activateMobileSide('right'));
    this.leftRoot?.addEventListener('click', (event) => {
      if (!this._suppressPeekTap && this.leftRoot.classList.contains('is-mobile-peek') && event.target.closest('.intel-sidebar__header')) this.activateMobileSide('left');
    });
    this.rightRoot?.addEventListener('click', (event) => {
      if (!this._suppressPeekTap && this.rightRoot.classList.contains('is-mobile-peek') && event.target.closest('.intel-sidebar__header')) this.activateMobileSide('right');
    });
  }

  collapse(side) {
    const root = side === 'left' ? this.leftRoot : this.rightRoot;
    const handle = side === 'left' ? this.leftHandle : this.rightHandle;
    root?.classList.add('is-collapsed');
    root?.classList.remove('is-mobile-primary', 'is-mobile-peek');
    if (handle && root?.classList.contains('is-active')) handle.hidden = false;
  }

  recall(side) {
    const root = side === 'left' ? this.leftRoot : this.rightRoot;
    const handle = side === 'left' ? this.leftHandle : this.rightHandle;
    root?.classList.remove('is-collapsed');
    if (handle) handle.hidden = true;
  }

  bindTabEvents() {
    const tabs = this.leftRoot?.querySelectorAll('.dcb-tab');
    const panels = this.leftRoot?.querySelectorAll('.dcb-panel');
    tabs?.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        panels?.forEach((p) => p.classList.toggle('active', p.id === `panel-${targetTab}`));
      });
    });
  }

  // ---- trade area (explore) --------------------------------------------
  renderTradeArea(tradeAreaDetails, overrideProperties = null) {
    if (!tradeAreaDetails) return;

    const { id, data = {}, properties = {} } = tradeAreaDetails;
    // In the tailored (match) funnel, only surface the user's matched properties for this area.
    const tailored = this.tailoredMode && this.tailoredByArea;
    const areaProperties = overrideProperties
      || (tailored ? (this.tailoredByArea[id] || []) : dataService.getPublicPropertiesForTradeArea(id));
    const stats = data.stats || {};
    const demographics = data.demographics || {};
    const commercial = data.commercial || {};
    const brands = data.brands || [];
    const anchors = commercial.anchors || [];

    this.showTradeArea();
    if (this.propertiesTitle) this.propertiesTitle.textContent = tailored ? 'Your matches here' : 'Available Properties';
    const tradeAreaName = text(data.name || properties.name, 'Trade area');
    const classification = classifyArea(properties);
    if (this.taTitle) this.taTitle.textContent = tradeAreaName;
    if (this.taTier) this.taTier.textContent = classification;

    // Contextual back: to matches (tailored) or to the city (free explore).
    if (this.taBack) {
      this.taBack.hidden = false;
      const cityName = properties.city || data.city || '';
      if (tailored) {
        if (this.taBackLabel) this.taBackLabel.textContent = 'Back to your matches';
        this.taBack.onclick = () => this.backToMatches();
      } else {
        if (this.taBackLabel) this.taBackLabel.textContent = cityName ? `Back to ${cityName}` : 'Back';
        this.taBack.onclick = () => { if (cityName) this.map?.loadCity?.(cityName); };
      }
    }

    this.renderStatsCard({
      name: tradeAreaName,
      tier: classification,
      corridor: properties.corridor,
      color: properties.color,
      rent: stats.rent,
      spend: stats.spend,
      units: commercial.units
    });

    if (this.demoPopulation) this.demoPopulation.textContent = text(demographics.population);
    if (this.demoGender) this.demoGender.textContent = text(demographics.gender);
    if (this.demoAge) this.demoAge.textContent = text(demographics.age);
    if (this.demoSegment) this.demoSegment.textContent = demographics.segment ? `${demographics.segment} Income Segment` : '--';
    if (this.demoFootfall) this.demoFootfall.textContent = text(stats.footfall);

    if (this.commAvgRent) this.commAvgRent.textContent = text(stats.rent);
    if (this.commRentBand) this.commRentBand.textContent = text(commercial.rentBand);
    if (this.commAvgSpend) this.commAvgSpend.textContent = text(stats.spend);
    if (this.commTotalUnits) this.commTotalUnits.textContent = text(commercial.units);

    if (this.commAnchors) {
      this.commAnchors.replaceChildren(
        ...anchors.map((anchor) => {
          const chip = document.createElement('div');
          chip.className = 'anchor-chip';
          chip.innerHTML = `<span class="anchor-chip-icon">A</span>${escapeHtml(anchor)}`;
          return chip;
        })
      );
      if (!anchors.length) {
        const fallback = document.createElement('span');
        fallback.style.cssText = 'color: var(--intel-muted); font-size: 13px;';
        fallback.textContent = 'No major anchors';
        this.commAnchors.replaceChildren(fallback);
      }
    }

    this.renderProperties(areaProperties);

    if (this.brandChips) {
      this.brandChips.replaceChildren(
        ...brands.map((brand) => {
          const chip = document.createElement('span');
          chip.className = 'brand-chip';
          chip.textContent = brand;
          return chip;
        })
      );
      if (!brands.length) {
        const fallback = document.createElement('span');
        fallback.style.cssText = 'color: var(--intel-muted); font-size: 13px;';
        fallback.textContent = 'Brand data not available';
        this.brandChips.replaceChildren(fallback);
      }
    }

    if (this.saturationContainer) {
      const suitableFor = properties.suitableFor || [];
      const corridor = text(properties.corridor, '').toLowerCase();
      const saturationMap = {
        'F&B': { base: suitableFor.includes('fb') ? 65 : 15 },
        'Fashion': { base: suitableFor.includes('fashion') ? 55 : 10 },
        'Electronics': { base: suitableFor.includes('electronics') ? 45 : 10 },
        'Wellness': { base: suitableFor.includes('wellness') ? 40 : 8 },
        'Lifestyle': { base: suitableFor.includes('lifestyle') ? 50 : 12 }
      };
      if (corridor.includes('nightlife')) { saturationMap['F&B'].base += 15; saturationMap['Lifestyle'].base += 10; }
      if (corridor.includes('family')) { saturationMap['F&B'].base += 10; saturationMap['Fashion'].base += 10; }
      if (corridor.includes('high street') || corridor.includes('premium')) { saturationMap['Fashion'].base += 15; }

      const categories = Object.entries(saturationMap).map(([label, { base }]) => {
        const pct = Math.min(base, 95);
        const cls = pct >= 60 ? 'high' : pct >= 35 ? 'medium' : 'low';
        const lbl = pct >= 60 ? 'High' : pct >= 35 ? 'Medium' : 'Low';
        return { label, percentage: pct, speedClass: cls, labelText: lbl };
      });

      this.saturationContainer.replaceChildren(
        ...categories.map((cat) => {
          const item = document.createElement('div');
          item.className = 'saturation-item';
          item.innerHTML = `
            <div class="saturation-category">${cat.label}</div>
            <div class="saturation-bar-bg">
              <div class="saturation-bar ${cat.speedClass}" style="width: ${cat.percentage}%;"></div>
            </div>
            <div class="saturation-label">${cat.labelText}</div>
          `;
          return item;
        })
      );
    }

    this.renderChart(stats);
  }

  // ---- matches (match flow) --------------------------------------------
  renderMatches(results) {
    this.showMatches();
    // Remember the tailored set so trade-area drill-downs stay filtered to the user's matches.
    this.tailoredMode = true;
    document.body.dataset.tailored = 'true';
    this.tailoredByArea = {};
    (results.tradeAreas || []).forEach((a) => { this.tailoredByArea[a.id] = a.properties || []; });

    const count = results.properties.length;
    const areaCount = results.tradeAreaIds.length;
    if (this.matchTitle) this.matchTitle.textContent = `${count} ${count === 1 ? 'property' : 'properties'}`;
    if (this.matchMeta) {
      this.matchMeta.textContent = count
        ? `across ${areaCount} trade area${areaCount === 1 ? '' : 's'}`
        : 'No matches — try refining your filters.';
    }
    if (this.matchList) {
      if (!count) {
        const empty = document.createElement('p');
        empty.className = 'intel-empty-copy';
        empty.textContent = 'No properties match these filters yet.';
        this.matchList.replaceChildren(empty);
      } else {
        this.gatedRender(this.matchList, results.properties, (p) => {
          // They're exploring now — drop the wizard results overlay.
          this.flow?.exitWizard?.();
          // Fly to that property's trade area (tailored view) and open its detail.
          if (this.map?.loadTradeArea && p.tradeArea) this.map.loadTradeArea(p.tradeArea);
          this.openPropertyDetail(p, () => this.backToMatches());
        });
      }
    }
  }

  backToMatches() {
    this.showListView();
    this.showMatches();
    // Return the map to the full set of highlighted tailored areas.
    if (this.tailoredByArea && this.map?.focusTradeAreas) {
      this.map.focusTradeAreas(Object.keys(this.tailoredByArea));
    }
  }

  renderStatsCard({ name, tier, corridor, color, rent, spend, units } = {}) {
    if (!this.statsCard) return;
    this.statsCard.hidden = false;
    document.body.dataset.statsOpen = 'true';
    this.statsCard.style.animation = 'none';
    void this.statsCard.offsetWidth;
    this.statsCard.style.animation = '';
    if (this.statsTierDot) this.statsTierDot.style.background = safeColor(color, 'var(--intel-gold)');
    if (this.statsTierLabel) this.statsTierLabel.textContent = text(tier, 'Trade area');
    if (this.statsTitle) this.statsTitle.textContent = text(name, '--');
    if (this.statsCorridor) this.statsCorridor.textContent = text(corridor, '');
    if (this.statsRent) this.statsRent.textContent = text(rent);
    if (this.statsSpend) this.statsSpend.textContent = text(spend);
    if (this.statsUnits) this.statsUnits.textContent = text(units);
  }

  hideStatsCard() {
    if (this.statsCard) this.statsCard.hidden = true;
    document.body.dataset.statsOpen = 'false';
  }

  renderProperties(areaProperties = []) {
    this.currentAreaProperties = areaProperties;
    this.showListView();
    if (this.propertyCount) this.propertyCount.textContent = String(areaProperties.length);
    if (!this.propertyList) return;
    if (!areaProperties.length) {
      const empty = document.createElement('p');
      empty.className = 'intel-empty-copy';
      empty.textContent = 'No available properties are mapped to this trade area yet.';
      this.propertyList.replaceChildren(empty);
      return;
    }
    this.gatedRender(this.propertyList, areaProperties, (p) =>
      this.openPropertyDetail(p, () => this.renderProperties(this.currentAreaProperties))
    );
  }

  // First N properties are interactive; the rest are locked placeholders (no real data in DOM).
  gatedRender(targetEl, properties, onCardClick) {
    if (!targetEl) return;
    const visible = properties.slice(0, this.MAX_VISIBLE);
    const lockedCount = Math.max(0, properties.length - this.MAX_VISIBLE);
    const nodes = visible.map((p) => {
      const card = createPropertyCard(p);
      card.classList.add('is-clickable');
      card.addEventListener('click', () => onCardClick(p));
      return card;
    });
    for (let i = 0; i < lockedCount; i += 1) nodes.push(this.createLockedCard());
    targetEl.replaceChildren(...nodes);
  }

  createLockedCard() {
    const card = document.createElement('article');
    card.className = 'intel-property-card intel-property-card--locked';
    card.innerHTML = `
      <div class="locked-ghost">
        <span class="ghost-line ghost-line--title"></span>
        <span class="ghost-line"></span>
        <span class="ghost-line ghost-line--short"></span>
      </div>
      <div class="locked-overlay">
        <span class="locked-icon">🔒</span>
        <span class="locked-text">Unlock to view</span>
      </div>`;
    card.addEventListener('click', () => this.requestUnlock());
    return card;
  }

  requestUnlock() {
    document.querySelector('.js-lead-open')?.click();
  }

  showListView() {
    if (this.propertyDetail) this.propertyDetail.hidden = true;
    if (this.rightListView) this.rightListView.hidden = false;
    if (this.propertyCount) this.propertyCount.hidden = false;
  }

  openPropertyDetail(property, returnFn) {
    if (!this.propertyDetail) return;
    this._detailReturn = returnFn || null;
    this.buildDetail(property);
    if (this.rightListView) this.rightListView.hidden = true;
    if (this.propertyCount) this.propertyCount.hidden = true;
    this.propertyDetail.hidden = false;
    this.recall('right');
    this.rightRoot?.classList.add('is-active');
    this.activateMobileSide('right');
  }

  backFromDetail() {
    if (this.propertyDetail) this.propertyDetail.hidden = true;
    if (this.rightListView) this.rightListView.hidden = false;
    if (this.propertyCount) this.propertyCount.hidden = false;
    const fn = this._detailReturn;
    this._detailReturn = null;
    if (fn) fn();
  }

  buildDetail(property) {
    const fits = (property.suitableFor || []).map((c) => CATEGORY_LABELS[c] || c);
    const sizeValue = property.sizeLabel || (property.size ? `${property.size} sq.ft` : '--');
    const rows = [
      ['Trade area', property.tradeAreaName],
      ['City', property.city],
      ['Size', sizeValue],
      ['Floor', property.floor],
      ['Building type', property.buildingType],
      ['Status', property.status],
      ['Indicative rent', property.priceLabel]
    ];
    const rowsHtml = rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('');
    const chipsHtml = fits.length
      ? `<div class="intel-property-card__chips">${fits.map((c) => `<span class="intel-fit-chip">${escapeHtml(c)}</span>`).join('')}</div>`
      : '';
    const facHtml = facilitiesFor(property)
      .map((f) => `
        <div class="intel-facility ${f.yes ? 'is-yes' : 'is-no'}">
          <span class="intel-facility__label">${f.label}</span>
          <span class="intel-facility__value">${f.yes ? 'Yes' : 'No'}</span>
        </div>`)
      .join('');

    this.propertyDetail.innerHTML = `
      <button type="button" class="intel-detail-back">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back
      </button>
      <div class="intel-detail-photo">
        <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M4 9l1.2-4.2A1 1 0 0 1 6.2 4h11.6a1 1 0 0 1 1 .8L20 9M5 9h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9zm0 0h14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
      </div>
      <div class="intel-detail-head">
        <h3>${escapeHtml(property.name || 'Property')}</h3>
        ${property.status ? `<span class="intel-property-card__status">${escapeHtml(property.status)}</span>` : ''}
      </div>
      ${chipsHtml}
      <dl class="intel-detail-grid">${rowsHtml}</dl>
      <div class="intel-detail-section">
        <p class="intel-detail-section__title">Facilities</p>
        <div class="intel-facility-grid">${facHtml}</div>
      </div>
      <div class="intel-detail-locked">
        <div class="intel-detail-locked__row"><span>Exact address</span><span class="blur-text">Koregaon Park Rd</span></div>
        <div class="intel-detail-locked__row"><span>Owner contact</span><span class="blur-text">+91 •• ••• ••••</span></div>
      </div>`;

    this.propertyDetail.querySelector('.intel-detail-back')?.addEventListener('click', () => this.backFromDetail());
  }

  renderChart(stats = {}) {
    if (!this.chartCanvas) return;
    this.chart?.destroy();
    this.chart = new Chart(this.chartCanvas, {
      type: 'bar',
      data: {
        labels: ['Footfall', 'Rent', 'Spend'],
        datasets: [{
          data: [firstNumber(stats.footfall) / 1000, firstNumber(stats.rent), firstNumber(stats.spend)],
          backgroundColor: ['#004337', '#7A8F53', '#C8A96A'],
          borderRadius: 4
        }]
      },
      options: {
        animation: false,
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#004337' } },
          y: { beginAtZero: true, grid: { color: 'rgba(0, 67, 55, 0.1)' }, ticks: { color: '#4C5A52' } }
        }
      }
    });
  }

  clear() {
    if (this.taTitle) this.taTitle.textContent = 'Select a trade area';
    if (this.demoPopulation) this.demoPopulation.textContent = '--';
    if (this.demoGender) this.demoGender.textContent = '--';
    if (this.demoAge) this.demoAge.textContent = '--';
    if (this.demoSegment) this.demoSegment.textContent = '--';
    if (this.demoFootfall) this.demoFootfall.textContent = '--';
    if (this.commAvgRent) this.commAvgRent.textContent = '--';
    if (this.commRentBand) this.commRentBand.textContent = '--';
    if (this.commAvgSpend) this.commAvgSpend.textContent = '--';
    if (this.commTotalUnits) this.commTotalUnits.textContent = '--';
    if (this.commAnchors) this.commAnchors.replaceChildren();
    if (this.brandChips) this.brandChips.replaceChildren();
    if (this.saturationContainer) this.saturationContainer.replaceChildren();
    this.renderProperties([]);
    this.chart?.destroy();
    this.chart = null;
  }
}

export default SidebarController;
