import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoData, tradeData } from '../../data/geoData.js';

const DEFAULT_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const VIEWPORTS = {
  overview: { center: [73.9, 20.9], zoom: 3.8, pitch: 0, bearing: 0 },
  India: { center: [75.9, 20.6], zoom: 4.6, pitch: 0, bearing: 0 },
  UAE: { center: [54.7, 24.5], zoom: 6.5, pitch: 0, bearing: 0 },
  Mumbai: { center: [72.8777, 19.076], zoom: 10.5, pitch: 28, bearing: -12 },
  Pune: { center: [73.8567, 18.5204], zoom: 10.6, pitch: 28, bearing: -12 },
  Dubai: { center: [55.2708, 25.2048], zoom: 10.6, pitch: 28, bearing: -12 }
};

const SOURCE_IDS = {
  countries: 'country-polygons',
  countryCenters: 'country-centers',
  cities: 'city-borders',
  tradeAreas: 'trade-areas'
};

const LAYER_IDS = [
  'country-fill',
  'country-line',
  'country-centers',
  'country-labels',
  'cities-fill',
  'cities-border',
  'cities-label',
  'trade-blobs',
  'trade-points',
  'trade-labels'
];

function featureBounds(features) {
  const bounds = new maplibregl.LngLatBounds();
  const extendCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      bounds.extend(coordinates);
      return;
    }
    coordinates.forEach(extendCoordinates);
  };

  features.forEach((feature) => extendCoordinates(feature.geometry?.coordinates));
  return bounds.isEmpty() ? null : bounds;
}

function getFeatureName(feature) {
  return feature?.properties?.name || feature?.properties?.id || '';
}

export class MapComponent {
  constructor(options = {}) {
    this.containerId = options.containerId || 'map-container';
    this.style = options.style || DEFAULT_STYLE;
    this.map = null;
    this.loaded = false;
    this.currentView = { level: 'overview', country: null, city: null, tradeArea: null };
    this.activeTradeAreaIds = null;
    this.handlers = {
      onReady: options.onReady || (() => {}),
      onCountryChange: options.onCountryChange || (() => {}),
      onCityChange: options.onCityChange || (() => {}),
      onTradeAreaChange: options.onTradeAreaChange || (() => {}),
      onViewChange: options.onViewChange || (() => {})
    };
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Map container #${this.containerId} was not found.`);
    }

    this.map = new maplibregl.Map({
      container,
      style: this.style,
      center: VIEWPORTS.overview.center,
      zoom: VIEWPORTS.overview.zoom,
      pitch: VIEWPORTS.overview.pitch,
      bearing: VIEWPORTS.overview.bearing,
      attributionControl: false
    });

    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    this.map.once('load', () => {
      this.loaded = true;
      this.applyCleanMapStyle();
      this.addSources();
      this.addLayers();
      this.bindInteractions();
      this.loadOverview();
      this.handlers.onReady(this);
    });

    return this;
  }

  resize() {
    this.map?.resize();
  }

  destroy() {
    this.map?.remove();
    this.map = null;
    this.loaded = false;
  }

  applyCleanMapStyle() {
    if (!this.map?.getStyle()?.layers) return;

    const noisyLayerPattern = /(poi|point|landmark|tourism|aeroway|airport|highway|motorway|trunk|road[_-]?number|shield|transport|transit|rail|ferry|place[_-]?(suburb|neighbourhood|hamlet)|housenumber)/i;

    this.map.getStyle().layers.forEach((layer) => {
      if (noisyLayerPattern.test(layer.id)) {
        this.map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    });
  }

  addSources() {
    this.addGeoJsonSource(SOURCE_IDS.countries, geoData.countryPolygons);
    this.addGeoJsonSource(SOURCE_IDS.countryCenters, geoData.countries);
    this.addGeoJsonSource(SOURCE_IDS.cities, geoData.cities);
    this.addGeoJsonSource(SOURCE_IDS.tradeAreas, geoData.tradeAreas);
  }

  addGeoJsonSource(id, data) {
    if (this.map.getSource(id)) return;
    const options = { type: 'geojson', data };
    if (id === SOURCE_IDS.tradeAreas) {
      options.promoteId = 'id';
    }
    this.map.addSource(id, options);
  }

  addLayers() {
    this.map.addLayer({
      id: 'country-fill',
      type: 'fill',
      source: SOURCE_IDS.countries,
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], '#004337'],
        'fill-opacity': 0.08
      }
    });

    this.map.addLayer({
      id: 'country-line',
      type: 'line',
      source: SOURCE_IDS.countries,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#004337'],
        'line-width': 1.4,
        'line-opacity': 0.55
      }
    });

    this.map.addLayer({
      id: 'country-centers',
      type: 'circle',
      source: SOURCE_IDS.countryCenters,
      paint: {
        'circle-radius': 12,
        'circle-color': '#004337',
        'circle-stroke-color': '#FAFAF5',
        'circle-stroke-width': 3
      }
    });

    this.map.addLayer({
      id: 'country-labels',
      type: 'symbol',
      source: SOURCE_IDS.countryCenters,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 14,
        'text-offset': [0, 1.45],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#004337',
        'text-halo-color': '#FAFAF5',
        'text-halo-width': 1.5
      }
    });

    this.map.addLayer({
      id: 'cities-fill',
      type: 'fill',
      source: SOURCE_IDS.cities,
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], '#004337'],
        'fill-opacity': 0.12
      }
    });

    this.map.addLayer({
      id: 'cities-border',
      type: 'line',
      source: SOURCE_IDS.cities,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#004337'],
        'line-width': 2,
        'line-opacity': 0.65
      }
    });

    this.map.addLayer({
      id: 'cities-label',
      type: 'symbol',
      source: SOURCE_IDS.cities,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 13
      },
      paint: {
        'text-color': '#004337',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2
      }
    });

    this.map.addLayer({
      id: 'trade-blobs',
      type: 'circle',
      source: SOURCE_IDS.tradeAreas,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 18, 13, 42],
        'circle-color': ['coalesce', ['get', 'color'], '#004337'],
        'circle-opacity': 0.14,
        'circle-blur': 0.35
      }
    });

    this.map.addLayer({
      id: 'trade-points',
      type: 'circle',
      source: SOURCE_IDS.tradeAreas,
      paint: {
        'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 11, 7],
        'circle-color': ['coalesce', ['get', 'color'], '#004337'],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 2],
        'circle-opacity': 0.92
      }
    });

    this.map.addLayer({
      id: 'trade-labels',
      type: 'symbol',
      source: SOURCE_IDS.tradeAreas,
      minzoom: 11,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, 1.3],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#004337',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2
      }
    });
  }

  bindInteractions() {
    ['country-fill', 'country-centers'].forEach((layerId) => {
      this.map.on('click', layerId, (event) => {
        const countryName = getFeatureName(event.features?.[0]);
        if (countryName) this.loadCountry(countryName);
      });
    });

    this.map.on('click', 'cities-fill', (event) => {
      const cityName = getFeatureName(event.features?.[0]);
      if (cityName) this.loadCity(cityName);
    });

    this.map.on('click', 'cities-label', (event) => {
      const cityName = getFeatureName(event.features?.[0]);
      if (cityName) this.loadCity(cityName);
    });

    this.map.on('click', 'trade-points', (event) => {
      const feature = event.features?.[0];
      if (feature) this.loadTradeArea(feature.properties.id);
    });

    ['country-fill', 'country-centers', 'cities-fill', 'cities-label', 'trade-points'].forEach((layerId) => {
      this.map.on('mouseenter', layerId, () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', layerId, () => {
        this.map.getCanvas().style.cursor = '';
      });
    });
  }

  loadOverview() {
    this.currentView = { level: 'overview', country: null, city: null, tradeArea: null };
    this.setLayerVisibility(['country-fill', 'country-line', 'country-centers', 'country-labels'], true);
    this.setLayerVisibility(['cities-fill', 'cities-border', 'cities-label', 'trade-blobs', 'trade-points', 'trade-labels'], false);
    this.resetTradeAreaFilter();
    this.flyTo(VIEWPORTS.overview);
    this.emitViewChange();
  }

  loadCountry(countryName) {
    const viewport = VIEWPORTS[countryName] || VIEWPORTS.overview;
    this.currentView = { level: 'country', country: countryName, city: null, tradeArea: null };
    this.setLayerVisibility(['country-fill', 'country-line', 'country-centers', 'country-labels'], false);
    this.setLayerVisibility(['cities-fill', 'cities-border', 'cities-label'], true);
    this.setLayerVisibility(['trade-blobs', 'trade-points', 'trade-labels'], false);
    this.map.setFilter('cities-fill', ['==', ['get', 'country'], countryName]);
    this.map.setFilter('cities-border', ['==', ['get', 'country'], countryName]);
    this.map.setFilter('cities-label', ['==', ['get', 'country'], countryName]);
    this.resetTradeAreaFilter();
    this.flyTo(viewport);
    this.handlers.onCountryChange(countryName);
    this.emitViewChange();
  }

  loadCity(cityName) {
    const cityFeature = this.getCityFeature(cityName);
    const viewport = VIEWPORTS[cityName] || VIEWPORTS.overview;
    const countryName = cityFeature?.properties?.country || this.currentView.country;
    this.currentView = { level: 'city', country: countryName, city: cityName, tradeArea: null };
    this.setLayerVisibility(['country-fill', 'country-line', 'country-centers', 'country-labels'], false);
    this.setLayerVisibility(['cities-fill'], false);
    this.setLayerVisibility(['cities-border', 'cities-label', 'trade-blobs', 'trade-points', 'trade-labels'], true);
    this.map.setFilter('cities-border', ['==', ['get', 'name'], cityName]);
    this.map.setFilter('cities-label', ['==', ['get', 'name'], cityName]);
    this.setTradeAreaCityFilter(cityName);
    this.flyTo(viewport);
    this.handlers.onCityChange(cityName);
    this.emitViewChange();
  }

  loadTradeArea(tradeAreaId) {
    const feature = this.getTradeAreaFeature(tradeAreaId);
    if (!feature) return;

    const [lng, lat] = feature.geometry.coordinates;
    const cityName = feature.properties.city;
    const cityFeature = this.getCityFeature(cityName);
    this.currentView = {
      level: 'tradeArea',
      country: cityFeature?.properties?.country || this.currentView.country,
      city: cityName,
      tradeArea: tradeAreaId
    };

    this.setLayerVisibility(['trade-blobs', 'trade-points', 'trade-labels', 'cities-border'], true);
    this.setTradeAreaCityFilter(cityName);
    this.setSelectedTradeArea(tradeAreaId);
    this.flyTo({ center: [lng, lat], zoom: 15.2, pitch: 50, bearing: -24 });
    this.handlers.onTradeAreaChange(this.getTradeAreaDetails(tradeAreaId));
    this.emitViewChange();
  }

  flyTo(viewport) {
    this.map.flyTo({
      ...viewport,
      speed: 0.85,
      curve: 1.25,
      essential: true
    });
  }

  setLayerVisibility(layerIds, isVisible) {
    layerIds.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
    });
  }

  setTradeAreaCityFilter(cityName) {
    const filter = ['==', ['get', 'city'], cityName];
    ['trade-blobs', 'trade-points', 'trade-labels'].forEach((layerId) => {
      if (this.map.getLayer(layerId)) this.map.setFilter(layerId, filter);
    });
    this.applyActiveTradeAreaHighlight();
  }

  resetTradeAreaFilter() {
    ['trade-blobs', 'trade-points', 'trade-labels'].forEach((layerId) => {
      if (this.map.getLayer(layerId)) this.map.setFilter(layerId, null);
    });
    this.activeTradeAreaIds = null;
    this.applyActiveTradeAreaHighlight();
  }

  highlightTradeAreas(tradeAreaIds = []) {
    this.activeTradeAreaIds = new Set(tradeAreaIds.filter(Boolean));
    this.applyActiveTradeAreaHighlight();
  }

  clearTradeAreaHighlights() {
    this.activeTradeAreaIds = null;
    this.applyActiveTradeAreaHighlight();
  }

  focusTradeAreas(tradeAreaIds = []) {
    const features = tradeAreaIds.map((id) => this.getTradeAreaFeature(id)).filter(Boolean);
    this.highlightTradeAreas(tradeAreaIds);
    if (!features.length) return;

    const bounds = featureBounds(features);
    if (bounds) {
      this.map.fitBounds(bounds, {
        padding: { top: 120, right: 420, bottom: 120, left: 360 },
        maxZoom: 12.6,
        duration: 900
      });
    }
  }

  applyActiveTradeAreaHighlight() {
    if (!this.map?.getLayer('trade-points')) return;

    if (!this.activeTradeAreaIds?.size) {
      this.map.setPaintProperty('trade-points', 'circle-opacity', 0.92);
      this.map.setPaintProperty('trade-points', 'circle-radius', ['case', ['boolean', ['feature-state', 'selected'], false], 11, 7]);
      return;
    }

    const ids = Array.from(this.activeTradeAreaIds);
    this.map.setPaintProperty('trade-points', 'circle-opacity', ['match', ['get', 'id'], ids, 1, 0.18]);
    this.map.setPaintProperty('trade-points', 'circle-radius', ['match', ['get', 'id'], ids, 10, 5]);
  }

  setSelectedTradeArea(tradeAreaId) {
    geoData.tradeAreas.features.forEach((feature) => {
      this.map.setFeatureState(
        { source: SOURCE_IDS.tradeAreas, id: feature.properties.id },
        { selected: feature.properties.id === tradeAreaId }
      );
    });
  }

  getCityFeature(cityName) {
    return geoData.cities.features.find((feature) => feature.properties.name === cityName) || null;
  }

  getTradeAreaFeature(tradeAreaId) {
    return geoData.tradeAreas.features.find((feature) => feature.properties.id === tradeAreaId) || null;
  }

  getTradeAreasByCity(cityName) {
    return geoData.tradeAreas.features.filter((feature) => feature.properties.city === cityName);
  }

  getTradeAreaDetails(tradeAreaId) {
    const feature = this.getTradeAreaFeature(tradeAreaId);
    if (!feature) return null;
    return {
      id: tradeAreaId,
      feature,
      properties: feature.properties,
      data: tradeData[tradeAreaId] || {}
    };
  }

  getCurrentView() {
    return { ...this.currentView };
  }

  emitViewChange() {
    this.handlers.onViewChange(this.getCurrentView());
  }
}

export default MapComponent;
