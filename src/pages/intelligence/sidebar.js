import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip
} from 'chart.js';
import { getPropertiesForTradeArea } from './filters.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

function text(value, fallback = '--') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function firstNumber(value) {
  const match = text(value, '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function createMetric(label, value) {
  const row = document.createElement('p');
  const key = document.createElement('span');
  const val = document.createElement('strong');
  key.textContent = label;
  val.textContent = text(value);
  row.append(key, val);
  return row;
}

export function createPropertyCard(property) {
  const card = document.createElement('article');
  card.className = 'intel-property-card';

  const title = document.createElement('h4');
  title.textContent = text(property.name, 'Unnamed property');

  const meta = document.createElement('dl');
  [
    ['Size', property.sizeLabel || property.size],
    ['Floor', property.floor],
    ['Price', property.priceLabel],
    ['Trade area', property.tradeAreaName]
  ].forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = text(value);
    meta.append(dt, dd);
  });

  card.append(title, meta);

  const href = safeUrl(property.locationLink);
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'View location';
    card.append(link);
  }

  return card;
}

export class SidebarController {
  constructor(options = {}) {
    this.root = options.root || document.getElementById('sidebar');
    this.title = options.title || document.getElementById('sidebar-title');
    this.propertyList = options.propertyList || document.getElementById('property-list');
    this.propertyCount = options.propertyCount || document.getElementById('property-count');
    this.demographicsPanel = options.demographicsPanel || document.getElementById('demographics-panel');
    this.brandscapePanel = options.brandscapePanel || document.getElementById('brandscape-panel');
    this.chartCanvas = options.chartCanvas || document.getElementById('stats-chart');
    this.chart = null;
    this.stats = {
      footfall: options.footfall || document.getElementById('stat-footfall'),
      rent: options.rent || document.getElementById('stat-rent'),
      spend: options.spend || document.getElementById('stat-spend')
    };
  }

  init() {
    this.clear();
    return this;
  }

  renderTradeArea(tradeAreaDetails, overrideProperties = null) {
    if (!tradeAreaDetails) return;

    const { id, data = {}, properties = {} } = tradeAreaDetails;
    const areaProperties = overrideProperties || getPropertiesForTradeArea(id);
    const stats = data.stats || {};

    this.root?.classList.add('is-active');
    if (this.title) this.title.textContent = text(data.name || properties.name, 'Trade area');
    this.renderCoreStats(stats);
    this.renderProperties(areaProperties);
    this.renderSecondaryPanels(data);
    this.renderChart(stats);
  }

  renderMatches(results) {
    this.root?.classList.add('is-active');
    if (this.title) this.title.textContent = `${results.properties.length} matching properties`;
    this.renderProperties(results.properties);

    if (results.tradeAreas.length === 1) {
      const area = results.tradeAreas[0];
      this.renderCoreStats(area.data?.stats || {});
      this.renderSecondaryPanels(area.data || {});
      this.renderChart(area.data?.stats || {});
    } else {
      this.renderCoreStats({
        footfall: `${results.tradeAreaIds.length} trade areas`,
        rent: 'Matched inventory',
        spend: `${results.properties.length} properties`
      });
      this.renderSecondaryPanels({
        demographics: { segment: 'Multiple catchments' },
        brands: results.tradeAreas.flatMap((area) => area.data?.brands || []).slice(0, 8)
      });
      this.renderChart({
        footfall: results.tradeAreaIds.length * 10000,
        rent: results.properties.length * 100,
        spend: results.properties.length * 250
      });
    }
  }

  renderCoreStats(stats = {}) {
    if (this.stats.footfall) this.stats.footfall.textContent = text(stats.footfall);
    if (this.stats.rent) this.stats.rent.textContent = text(stats.rent);
    if (this.stats.spend) this.stats.spend.textContent = text(stats.spend);
  }

  renderProperties(areaProperties = []) {
    if (this.propertyCount) this.propertyCount.textContent = String(areaProperties.length);

    if (!this.propertyList) return;

    if (!areaProperties.length) {
      const empty = document.createElement('p');
      empty.className = 'intel-empty-copy';
      empty.textContent = 'No available properties are mapped to this trade area yet.';
      this.propertyList.replaceChildren(empty);
      return;
    }

    this.propertyList.replaceChildren(...areaProperties.map(createPropertyCard));
  }

  renderSecondaryPanels(data = {}) {
    if (this.demographicsPanel) {
      const demographics = data.demographics || {};
      this.demographicsPanel.replaceChildren(
        createMetric('Population', demographics.population),
        createMetric('Age profile', demographics.age),
        createMetric('Gender mix', demographics.gender),
        createMetric('Segment', demographics.segment)
      );
    }

    if (this.brandscapePanel) {
      const commercial = data.commercial || {};
      const brands = data.brands || [];
      const anchors = commercial.anchors || [];
      this.brandscapePanel.replaceChildren(
        createMetric('Anchors', anchors.length ? anchors.join(', ') : ''),
        createMetric('Retail units', commercial.units),
        createMetric('Brands', brands.length ? brands.join(', ') : '')
      );
    }
  }

  renderChart(stats = {}) {
    if (!this.chartCanvas) return;

    this.chart?.destroy();
    this.chart = new Chart(this.chartCanvas, {
      type: 'bar',
      data: {
        labels: ['Footfall', 'Rent', 'Spend'],
        datasets: [
          {
            data: [
              firstNumber(stats.footfall) / 1000,
              firstNumber(stats.rent),
              firstNumber(stats.spend)
            ],
            backgroundColor: ['#004337', '#7A8F53', '#C8A96A'],
            borderRadius: 4
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#004337' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 67, 55, 0.1)' },
            ticks: { color: '#4C5A52' }
          }
        }
      }
    });
  }

  clear() {
    if (this.title) this.title.textContent = 'Select a trade area';
    this.renderCoreStats();
    this.renderProperties([]);
    this.renderSecondaryPanels();
    this.chart?.destroy();
    this.chart = null;
  }
}

export default SidebarController;
