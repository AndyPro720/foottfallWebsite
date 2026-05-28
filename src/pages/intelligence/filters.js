import properties from '../../data/properties.json';
import { geoData, tradeData } from '../../data/geoData.js';

const SIZE_RANGES = {
  any: [0, Infinity],
  '<500': [0, 499],
  '500-2000': [500, 2000],
  '2000-5000': [2000, 5000],
  '5000+': [5000, Infinity]
};

const BUDGET_RANGES = {
  any: [0, Infinity],
  '<200': [0, 199],
  '200-500': [200, 500],
  '500-1000': [500, 1000],
  '1000+': [1000, Infinity]
};

const CATEGORY_ALIASES = {
  'f&b': 'fb',
  fnb: 'fb',
  food: 'fb',
  restaurant: 'fb',
  restaurants: 'fb',
  retail: 'retail',
  showroom: 'retail',
  fashion: 'fashion',
  wellness: 'wellness',
  lifestyle: 'lifestyle'
};

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeCategory(value) {
  const token = normalizeToken(value);
  return CATEGORY_ALIASES[token] || token;
}

function inRange(value, range) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return false;
  const [min, max] = range;
  const numericValue = Number(value);
  return numericValue >= min && numericValue <= max;
}

export function getTradeAreaFeature(tradeAreaId) {
  return geoData.tradeAreas.features.find((feature) => feature.properties.id === tradeAreaId) || null;
}

export function getTradeAreaProperties(tradeAreaId) {
  return getTradeAreaFeature(tradeAreaId)?.properties || null;
}

export function propertyMatchesCategory(property, categories = []) {
  const requested = categories.map(normalizeCategory).filter(Boolean);
  if (!requested.length) return true;

  const propertyCategories = (property.suitableFor || []).map(normalizeCategory);
  const tradeAreaCategories = (getTradeAreaProperties(property.tradeArea)?.suitableFor || []).map(normalizeCategory);
  const available = new Set([...propertyCategories, ...tradeAreaCategories]);

  return requested.some((category) => available.has(category));
}

export function propertyMatchesSize(property, size = 'any') {
  const range = SIZE_RANGES[size] || SIZE_RANGES.any;
  return range === SIZE_RANGES.any || inRange(property.size, range);
}

export function propertyMatchesBudget(property, budget = 'any') {
  const range = BUDGET_RANGES[budget] || BUDGET_RANGES.any;
  return range === BUDGET_RANGES.any || inRange(property.price, range);
}

export function propertyMatchesQuery(property, query = {}) {
  if (query.city && property.city !== query.city) return false;
  if (!property.tradeArea) return false;

  return (
    propertyMatchesCategory(property, query.categories || query.category || []) &&
    propertyMatchesSize(property, query.size || 'any') &&
    propertyMatchesBudget(property, query.budget || 'any')
  );
}

export function matchProperties(query = {}, sourceProperties = properties) {
  const matches = sourceProperties.filter((property) => propertyMatchesQuery(property, query));
  const tradeAreaIds = Array.from(new Set(matches.map((property) => property.tradeArea).filter(Boolean)));
  const tradeAreas = tradeAreaIds.map((tradeAreaId) => ({
    id: tradeAreaId,
    feature: getTradeAreaFeature(tradeAreaId),
    data: tradeData[tradeAreaId] || {},
    properties: matches.filter((property) => property.tradeArea === tradeAreaId)
  }));

  return {
    query,
    properties: matches,
    tradeAreaIds,
    tradeAreas
  };
}

export function getPropertiesForTradeArea(tradeAreaId, sourceProperties = properties) {
  return sourceProperties.filter((property) => property.tradeArea === tradeAreaId);
}

export function readFilterForm(form) {
  const formData = new FormData(form);
  return {
    categories: formData.getAll('category').map(normalizeCategory),
    size: formData.get('size') || 'any',
    budget: formData.get('budget') || 'any'
  };
}

function createResultCard(property) {
  const card = document.createElement('article');
  card.className = 'intel-result-card';

  const title = document.createElement('h3');
  title.textContent = property.name || 'Unnamed property';

  const meta = document.createElement('p');
  meta.textContent = `${property.tradeAreaName || 'Trade area'} | ${property.sizeLabel || 'Size unavailable'} | ${property.priceLabel || 'Price unavailable'}`;

  card.append(title, meta);
  return card;
}

function renderEmptyState(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'intel-empty-state';

  const title = document.createElement('h3');
  title.textContent = 'No matching properties found';

  const body = document.createElement('p');
  body.textContent = 'Try adjusting your filters (size or budget) or contact our advisory team.';

  wrapper.append(title, body);
  container.replaceChildren(wrapper);
}

export class FiltersController {
  constructor(options = {}) {
    this.form = options.form || document.getElementById('match-form');
    this.clearButton = options.clearButton || document.getElementById('clear-filters');
    this.resultsList = options.resultsList || document.getElementById('results-list');
    this.resultsModal = options.resultsModal || document.getElementById('results-modal');
    this.map = options.map || null;
    this.onResults = options.onResults || (() => {});
    this.lastResults = null;
  }

  init() {
    this.form?.addEventListener('submit', (event) => this.handleSubmit(event));
    this.clearButton?.addEventListener('click', () => this.clear());
    return this;
  }

  handleSubmit(event) {
    event?.preventDefault();
    if (!this.form) return null;

    const query = readFilterForm(this.form);
    const results = matchProperties(query);
    this.lastResults = results;

    this.map?.focusTradeAreas?.(results.tradeAreaIds);
    this.renderResults(results);
    this.onResults(results);

    return results;
  }

  renderResults(results) {
    if (!this.resultsList) return;

    if (!results.properties.length) {
      renderEmptyState(this.resultsList);
    } else {
      const cards = results.properties.map(createResultCard);
      this.resultsList.replaceChildren(...cards);
    }

    if (this.resultsModal && typeof this.resultsModal.showModal === 'function' && !this.resultsModal.open) {
      this.resultsModal.showModal();
    }
  }

  clear() {
    this.form?.reset();
    this.lastResults = null;
    this.map?.clearTradeAreaHighlights?.();

    if (this.resultsList) {
      this.resultsList.replaceChildren();
    }
  }
}

export { properties as propertyInventory };
