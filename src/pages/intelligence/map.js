import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoData, tradeData } from '../../data/geoData.js';
import properties from '../../data/properties.json';

const DEFAULT_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// Global/overview view is hidden from end users by default; they start at a country.
const DEFAULT_COUNTRY = 'India';

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
  'cities-glow',
  'cities-label',
  'trade-heatmap-outer',
  'trade-blobs',
  'trade-points',
  'trade-labels',
  '3d-buildings'
];

let hoveredCityId = null;

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

    // Ensure the container has dimensions before creating the map
    // MapLibre requires a non-zero-size container
    const ensureSize = () => {
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('Map container has zero dimensions, waiting for layout...');
        return false;
      }
      return true;
    };

    const createMap = () => {
      console.log('Map container size on init:', container.offsetWidth, 'x', container.offsetHeight);

      this.map = new maplibregl.Map({
        container,
        style: this.style,
        center: VIEWPORTS.overview.center,
        zoom: VIEWPORTS.overview.zoom,
        pitch: VIEWPORTS.overview.pitch,
        bearing: VIEWPORTS.overview.bearing,
        attributionControl: false,
        maxPitch: 70
      });

      this.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
      this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      this.map.once('load', () => {
        this.loaded = true;
        this.applyCleanMapStyle();
        this.addSources();
        this.addLayers();
        this.addPinMarkers();
        this.bindInteractions();
        if (this.pendingCity) {
          this.loadCity(this.pendingCity);
          this.pendingCity = null;
        } else {
          this.loadCountry(this.pendingCountry || DEFAULT_COUNTRY);
          this.pendingCountry = null;
        }
        // Auto-collapse the attribution control to just the ⓘ toggle.
        this.collapseAttribution();
        this.handlers.onReady(this);
      });
    };

    if (ensureSize()) {
      createMap();
    } else {
      // Use ResizeObserver to wait for container to have dimensions
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            observer.disconnect();
            createMap();
            break;
          }
        }
      });
      observer.observe(container);
    }

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

    // Keep only major place labels (city/town/capital); drop suburb/neighbourhood/village clutter.
    const placePattern = /place|locality|neighbourhood|suburb|village|hamlet|island|state|region|county|district/i;
    const keepPlacePattern = /(city|town|capital)/i;

    this.map.getStyle().layers.forEach((layer) => {
      if (noisyLayerPattern.test(layer.id)) {
        this.map.setLayoutProperty(layer.id, 'visibility', 'none');
        return;
      }
      if (placePattern.test(layer.id) && !keepPlacePattern.test(layer.id)) {
        this.map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    });

    this.applyGreenTheme();
  }

  applyGreenTheme() {
    const layers = this.map?.getStyle()?.layers;
    if (!layers) return;

    // Foottfall green/white palette
    const LAND = '#E8EEE4';      // soft sage land (lets white roads read)
    const WATER = '#1F5E4E';     // dark green water
    const GREEN_SOFT = '#DBE8D4';// landcover / residential
    const GREEN_MED = '#C3D9BC'; // woods / parks / forest
    const BUILDING = '#DFE6D8';  // faint buildings
    const ROAD = '#FFFFFF';      // crisp white roads
    const ROAD_MINOR = '#F3F6F1';
    const BORDER = 'rgba(0, 67, 55, 0.18)';

    const set = (id, prop, val) => {
      try { this.map.setPaintProperty(id, prop, val); } catch { /* layer lacks prop */ }
    };

    layers.forEach((layer) => {
      const id = layer.id;
      const type = layer.type;

      if (type === 'background') { set(id, 'background-color', LAND); return; }

      if (type === 'fill') {
        if (/water|ocean|sea|river|bay|pond|reservoir/i.test(id)) { set(id, 'fill-color', WATER); set(id, 'fill-opacity', 1); }
        else if (/wood|forest|grass|park|golf|pitch|garden|nature|scrub|meadow/i.test(id)) { set(id, 'fill-color', GREEN_MED); set(id, 'fill-opacity', 0.7); }
        else if (/landcover|landuse|wetland|farmland|residential|industrial|commercial|cemetery|sand|rock|glacier/i.test(id)) { set(id, 'fill-color', GREEN_SOFT); set(id, 'fill-opacity', 0.6); }
        else if (/building/i.test(id)) { set(id, 'fill-color', BUILDING); set(id, 'fill-opacity', 0.8); }
        else { set(id, 'fill-color', LAND); }
        return;
      }

      if (type === 'line') {
        if (/water|river|waterway|canal/i.test(id)) { set(id, 'line-color', WATER); }
        else if (/boundary|admin/i.test(id)) { set(id, 'line-color', BORDER); }
        else if (/bridge|tunnel|street|service|minor|path|track/i.test(id)) { set(id, 'line-color', ROAD_MINOR); }
        else if (/road|highway|motorway|trunk|primary|secondary|tertiary/i.test(id)) { set(id, 'line-color', ROAD); }
        else { set(id, 'line-color', ROAD_MINOR); }
        return;
      }

      if (type === 'fill-extrusion') { set(id, 'fill-extrusion-color', BUILDING); }
    });
  }

  addPinMarkers() {
    this.markers = new Map();
    geoData.tradeAreas.features.forEach((feature) => {
      const id = feature.properties.id;
      const color = feature.properties.color || '#004337';
      // Outer element is positioned by MapLibre (transform); inner element owns our animations.
      const root = document.createElement('div');
      root.className = 'intel-map-pin-root';
      root.dataset.tradeAreaId = id;

      const pin = document.createElement('div');
      pin.className = 'intel-map-pin';
      pin.innerHTML = `
        <svg width="23" height="31" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 1.5C8.54 1.5 2.5 7.54 2.5 15c0 9.2 13.5 25.5 13.5 25.5S29.5 24.2 29.5 15C29.5 7.54 23.46 1.5 16 1.5z"
                fill="${color}" stroke="rgba(0,0,0,0.14)" stroke-width="1"/>
          <circle cx="16" cy="15" r="5.5" fill="#fff"/>
        </svg>`;

      const label = document.createElement('span');
      label.className = 'intel-map-pin__label';
      label.textContent = feature.properties.name || '';

      root.append(pin, label);

      root.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadTradeArea(id);
      });

      const marker = new maplibregl.Marker({ element: root, anchor: 'bottom' })
        .setLngLat(feature.geometry.coordinates)
        .addTo(this.map);
      root.style.display = 'none';
      this.markers.set(id, marker);
    });
  }

  setMarkersForCity(cityName) {
    if (!this.markers) return;
    const visibleIds = new Set(this.getTradeAreasByCity(cityName).map((f) => f.properties.id));
    let index = 0;
    this.markers.forEach((marker, id) => {
      const root = marker.getElement();
      if (visibleIds.has(id)) {
        root.style.display = '';
        const pin = root.firstElementChild;
        if (pin) {
          // restart the drop animation with a stagger
          pin.style.animation = 'none';
          void pin.offsetWidth;
          pin.style.animation = `pinDrop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 55}ms backwards`;
        }
        index += 1;
      } else {
        root.style.display = 'none';
      }
    });
  }

  hideAllMarkers() {
    this.markers?.forEach((marker) => {
      marker.getElement().style.display = 'none';
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
    const options = { type: 'geojson', data, generateId: true };
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
        'line-width': 2.5,
        'line-opacity': 0.7
      }
    });

    // City hover glow
    this.map.addLayer({
      id: 'cities-glow',
      type: 'line',
      source: SOURCE_IDS.cities,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#004337'],
        'line-width': 8,
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.35,
          0
        ],
        'line-blur': 6
      }
    });

    this.map.addLayer({
      id: 'cities-label',
      type: 'symbol',
      source: SOURCE_IDS.cities,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 14,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#004337',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2
      }
    });

    this.map.addLayer({
      id: 'trade-heatmap-outer',
      type: 'circle',
      source: SOURCE_IDS.tradeAreas,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 60, 12, 160, 14, 240],
        'circle-color': ['coalesce', ['get', 'color'], '#004337'],
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.06, 12, 0.1, 15, 0.04],
        'circle-blur': 1
      }
    });

    this.map.addLayer({
      id: 'trade-blobs',
      type: 'circle',
      source: SOURCE_IDS.tradeAreas,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 42, 12, 100, 14, 150],
        'circle-color': ['coalesce', ['get', 'color'], '#004337'],
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.12, 12, 0.2, 15, 0.08],
        'circle-blur': 0.85
      }
    });

    this.map.addLayer({
      id: 'trade-points',
      type: 'circle',
      source: SOURCE_IDS.tradeAreas,
      paint: {
        'circle-radius': 4,
        'circle-color': ['coalesce', ['get', 'color'], '#004337'],
        'circle-opacity': 0
      }
    });

    // Trade-area names are rendered via styled HTML markers (intel-map-pin__label),
    // so this MapLibre label layer stays hidden — kept only to satisfy layer-id lists.
    this.map.addLayer({
      id: 'trade-labels',
      type: 'symbol',
      source: SOURCE_IDS.tradeAreas,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'visibility': 'none'
      }
    });

    // 3D buildings layer — visible at trade area zoom
    this.map.addLayer({
      id: '3d-buildings',
      source: 'openmaptiles',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#DFE6DA',
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, ['get', 'render_height']],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, ['get', 'render_min_height']],
        'fill-extrusion-opacity': 0.65
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

    // City hover glow effect
    this.map.on('mouseenter', 'cities-fill', (event) => {
      this.map.getCanvas().style.cursor = 'pointer';
      const feature = event.features?.[0];
      if (feature?.id != null) {
        if (hoveredCityId !== null) {
          this.map.setFeatureState({ source: SOURCE_IDS.cities, id: hoveredCityId }, { hover: false });
        }
        hoveredCityId = feature.id;
        this.map.setFeatureState({ source: SOURCE_IDS.cities, id: hoveredCityId }, { hover: true });
      }
    });

    this.map.on('mouseleave', 'cities-fill', () => {
      this.map.getCanvas().style.cursor = '';
      if (hoveredCityId !== null) {
        this.map.setFeatureState({ source: SOURCE_IDS.cities, id: hoveredCityId }, { hover: false });
        hoveredCityId = null;
      }
    });

    ['country-fill', 'country-centers', 'cities-label', 'trade-points'].forEach((layerId) => {
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
    this.setLayerVisibility(['cities-fill', 'cities-border', 'cities-glow', 'cities-label', 'trade-heatmap-outer', 'trade-blobs', 'trade-points', 'trade-labels', '3d-buildings'], false);
    this.hideAllMarkers();
    this.clearPropertyPins();
    this.resetTradeAreaFilter();
    this.flyTo(VIEWPORTS.overview);
    this.emitViewChange();
  }

  loadCountry(countryName) {
    if (!this.loaded) { this.pendingCountry = countryName; return; }
    this.currentView = { level: 'country', country: countryName, city: null, tradeArea: null };
    this.setLayerVisibility(['country-fill', 'country-line', 'country-centers', 'country-labels'], false);
    this.setLayerVisibility(['cities-fill', 'cities-border', 'cities-glow', 'cities-label'], true);
    this.setLayerVisibility(['trade-heatmap-outer', 'trade-blobs', 'trade-points', 'trade-labels', '3d-buildings'], false);
    this.hideAllMarkers();
    this.clearPropertyPins();
    const countryFilter = ['==', ['get', 'country'], countryName];
    this.map.setFilter('cities-fill', countryFilter);
    this.map.setFilter('cities-border', countryFilter);
    this.map.setFilter('cities-glow', countryFilter);
    this.map.setFilter('cities-label', countryFilter);
    this.resetTradeAreaFilter();
    this.fitToCountry(countryName);
    this.handlers.onCountryChange(countryName);
    this.emitViewChange();
  }

  // Zoom as tight as possible while keeping every city in this country framed.
  fitToCountry(countryName) {
    const cityFeatures = geoData.cities.features.filter(
      (f) => f.properties?.country === countryName
    );
    const bounds = featureBounds(cityFeatures);
    if (bounds) {
      this.map.fitBounds(bounds, {
        padding: { top: 120, right: 120, bottom: 140, left: 120 },
        maxZoom: 9,
        duration: 900,
        pitch: 0,
        bearing: 0
      });
    } else {
      this.flyTo(VIEWPORTS[countryName] || VIEWPORTS.overview);
    }
  }

  // Reveal the hidden global/overview view (accessed via a discrete toggle).
  showGlobal() {
    this.loadOverview();
  }

  collapseAttribution() {
    const container = this.map?.getContainer?.();
    const attrib = container?.querySelector('.maplibregl-ctrl-attrib');
    attrib?.classList.remove('maplibregl-compact-show');
  }

  getCountries() {
    return [...new Set(geoData.cities.features.map((f) => f.properties?.country).filter(Boolean))].sort();
  }

  loadCity(cityName) {
    if (!this.loaded) { this.pendingCity = cityName; return; }
    const cityFeature = this.getCityFeature(cityName);
    const countryName = cityFeature?.properties?.country || this.currentView.country;
    this.currentView = { level: 'city', country: countryName, city: cityName, tradeArea: null };
    this.setLayerVisibility(['country-fill', 'country-line', 'country-centers', 'country-labels'], false);
    this.setLayerVisibility(['cities-fill', 'cities-glow'], false);
    this.setLayerVisibility(['cities-border', 'cities-label', 'trade-heatmap-outer', 'trade-blobs', 'trade-points'], true);
    this.setLayerVisibility(['3d-buildings'], false);
    this.map.setFilter('cities-border', ['==', ['get', 'name'], cityName]);
    this.map.setFilter('cities-label', ['==', ['get', 'name'], cityName]);
    this.setTradeAreaCityFilter(cityName);
    this.setMarkersForCity(cityName);
    this.clearPropertyPins();
    this.fitToCity(cityName);
    this.handlers.onCityChange(cityName);
    this.emitViewChange();
  }

  // Frame all trade-area pins in the city, flat (clean top-down) rather than tilted.
  fitToCity(cityName) {
    const areas = this.getTradeAreasByCity(cityName);
    const bounds = featureBounds(areas);
    if (bounds && areas.length > 1) {
      this.map.fitBounds(bounds, {
        padding: { top: 130, right: 150, bottom: 150, left: 150 },
        maxZoom: 12.2,
        duration: 850,
        pitch: 42,
        bearing: -14
      });
    } else {
      const vp = VIEWPORTS[cityName] || this.computeCityViewport(cityName);
      this.flyTo({ ...vp, pitch: 42, bearing: -14 });
    }
  }

  loadTradeArea(tradeAreaId) {
    if (!this.loaded) return;
    const feature = this.getTradeAreaFeature(tradeAreaId);
    if (!feature) return;

    const [lng, lat] = feature.geometry.coordinates;
    const cityName = feature.properties.city;
    const cityFeature = this.getCityFeature(cityName);
    this.currentView = {
      level: 'tradeArea',
      country: cityFeature?.properties?.country || this.currentView.country,
      city: cityName,
      tradeArea: feature.properties.name || tradeAreaId,
      tradeAreaId
    };

    this.setLayerVisibility(['trade-heatmap-outer', 'trade-blobs', 'trade-points', 'cities-border'], true);
    this.setLayerVisibility(['3d-buildings'], true);
    this.setTradeAreaCityFilter(cityName);
    this.setMarkersForCity(cityName);
    this.setSelectedTradeArea(tradeAreaId);
    this.showPropertyPins([lng, lat], tradeAreaId);
    this.flyTo({ center: [lng, lat], zoom: 16, pitch: 60, bearing: -30 });
    this.handlers.onTradeAreaChange(this.getTradeAreaDetails(tradeAreaId));
    this.emitViewChange();
  }

  // One shop-pin per property, scattered naturally around the trade area.
  // Clickable → opens that property. In match mode, non-matched properties are greyed.
  showPropertyPins(center, tradeAreaId) {
    this.clearPropertyPins();
    const props = properties.filter((p) => p.tradeArea === tradeAreaId).slice(0, 10);
    if (!props.length) return;

    // Which of these are in the user's tailored matches (match mode)?
    const tailored = window.foottfallIntelligence?.tailoredResults;
    const matched = tailored?.tradeAreas?.find((a) => a.id === tradeAreaId)?.properties;
    const matchedSet = matched ? new Set(matched) : null;

    const [lng, lat] = center;
    this.propertyPins = [];
    props.forEach((prop) => {
      // random, natural scatter (not a rigid ring)
      const angle = Math.random() * Math.PI * 2;
      const r = 0.0006 + Math.random() * 0.0022;
      const elng = lng + Math.cos(angle) * r * 1.5;
      const elat = lat + Math.sin(angle) * r;

      const el = document.createElement('div');
      el.className = 'intel-shop-pin';
      el.title = prop.name || 'Property';
      if (matchedSet && !matchedSet.has(prop)) el.classList.add('is-dimmed');
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path d="M4 4h16l1 5a2.5 2.5 0 0 1-4.9.6A2.5 2.5 0 0 1 12 10a2.5 2.5 0 0 1-4.1-.4A2.5 2.5 0 0 1 3 9l1-5Z" fill="currentColor"/>
          <path d="M5 11v8a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>`;
      const label = document.createElement('span');
      label.className = 'intel-shop-pin__label';
      label.textContent = prop.name || 'Property';
      el.append(label);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sidebar?.openPropertyDetail?.(prop, () => this.sidebar.renderProperties(this.sidebar.currentAreaProperties));
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([elng, elat])
        .addTo(this.map);
      this.propertyPins.push(marker);
    });
  }

  clearPropertyPins() {
    (this.propertyPins || []).forEach((m) => m.remove());
    this.propertyPins = [];
  }

  flyTo(viewport) {
    this.map.flyTo({
      ...viewport,
      speed: 1.4,
      curve: 1.3,
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
    ['trade-heatmap-outer', 'trade-blobs', 'trade-points', 'trade-labels'].forEach((layerId) => {
      if (this.map.getLayer(layerId)) this.map.setFilter(layerId, filter);
    });
    this.applyActiveTradeAreaHighlight();
  }

  resetTradeAreaFilter() {
    ['trade-heatmap-outer', 'trade-blobs', 'trade-points', 'trade-labels'].forEach((layerId) => {
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
    if (!this.markers) return;
    if (!this.activeTradeAreaIds?.size) {
      this.markers.forEach((marker) => {
        const el = marker.getElement();
        el.style.opacity = '';
        el.classList.remove('is-dimmed', 'is-active');
      });
      return;
    }
    this.markers.forEach((marker, id) => {
      const el = marker.getElement();
      if (this.activeTradeAreaIds.has(id)) {
        el.classList.add('is-active');
        el.classList.remove('is-dimmed');
      } else {
        el.classList.add('is-dimmed');
        el.classList.remove('is-active');
      }
    });
  }

  setSelectedTradeArea(tradeAreaId) {
    if (!this.loaded) return;
    geoData.tradeAreas.features.forEach((feature) => {
      this.map.setFeatureState(
        { source: SOURCE_IDS.tradeAreas, id: feature.properties.id },
        { selected: feature.properties.id === tradeAreaId }
      );
    });
    this.markers?.forEach((marker, id) => {
      marker.getElement().classList.toggle('is-selected', id === tradeAreaId);
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

  computeCityViewport(cityName) {
    const areas = this.getTradeAreasByCity(cityName);
    if (!areas.length) return VIEWPORTS.overview;
    const lngs = areas.map((f) => f.geometry.coordinates[0]);
    const lats = areas.map((f) => f.geometry.coordinates[1]);
    return {
      center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
      zoom: 10.5,
      pitch: 28,
      bearing: -12
    };
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
