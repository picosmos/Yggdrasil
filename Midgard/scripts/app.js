import { normalizeMapSource, readPerTrackParams, writePerTrackParams } from "./url.js";
import { MapManager } from "./mapManager.js";
import { ColorManager } from "./colorManager.js";
import { StateManager } from "./stateManager.js";
import { createSliderHandler, formatBreakHours, formatSegmentLength, createSegmentLengthHandler } from "./sliders.js";
import { renderTrack } from "./trackRenderer.js";
import { renderHuts, loadHuts } from "./hutRenderer.js";
import { readCookie, setCookie } from "./cookies.js";

const BREAK_HOUR_VALUES = [
	...Array.from({ length: 12 }, (_, index) => 0.25 + index * 0.25),
	...Array.from({ length: 21 }, (_, index) => 4 + index),
	...Array.from({ length: 8 }, (_, index) => 30 + index * 6)
];

const SPEED_CUTOFF_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 50, 80, 100, 130];

const MIN_SEGMENT_LENGTH_KM = 0.1;
const MAX_SEGMENT_LENGTH_KM = 50;
const SEGMENT_LENGTH_SLIDER_STEPS = 123;

const MAP_SOURCES = [
	{
		key: "kartverket",
		label: "Kartverket",
		url: "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
		options: { maxZoom: 18, attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>' }
	},
	{
		key: "osm",
		label: "Classic OpenStreetMap (OSM)",
		url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		options: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }
	},
	{
		key: "opentopo",
		label: "OpenTopoMap",
		url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
		options: { maxZoom: 19, attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)' }
	},
	{
		key: "tracetrack",
		label: "TracesTrack",
		url: "https://tile.tracestrack.com/topo__/{z}/{x}/{y}.webp?key=93c82c5a9cfbfe0b23d580ec3b4752ed",
		options: { maxZoom: 19, attribution: '&copy; <a href="https://tracetrack.com/">TracesTrack</a>' }
	}
];

const DEFAULT_VIEW = {
	lat: 60.39299,
	lng: 5.32415,
	zoom: 12
};

const DEFAULT_STATE = {
	ids: [],
	mapSource: MAP_SOURCES[0].key,
	breakHours: 3.0,
	speedCutoff: 8.0,
	lat: DEFAULT_VIEW.lat,
	lng: DEFAULT_VIEW.lng,
	zoom: DEFAULT_VIEW.zoom,
	segmentLengthLimitKm: 3.0,
	showHuts: true
};

const urlStateOptions = {
	alias: {
		mapSource: "src",
		breakHours: "bh",
		speedCutoff: "sco",
		zoom: "z",
		segmentLengthLimitKm: "sll",
		showHuts: "hts",
		color: "clr"
	},
	perTrackAlias: {
		color: "clr",
		breakHours: "bh",
		colorEnabled: "ce"
	},
	numberKeys: ["breakHours", "speedCutoff", "lat", "lng", "zoom", "segmentLengthLimitKm"],
	booleanKeys: ["showHuts"],
	persistedKeys: ["ids", "mapSource", "breakHours", "speedCutoff", "lat", "lng", "zoom", "segmentLengthLimitKm", "showHuts", "color"]
};

const createAppState = () => {
	const stateManager = new StateManager(DEFAULT_STATE, urlStateOptions);
	const { state, menuOpen } = stateManager.initialize();

	const colorManager = new ColorManager();
	const { colorEnabled, baseColor } = colorManager.initialize();

	const mapManager = new MapManager();

	const breakHoursSlider = createSliderHandler(BREAK_HOUR_VALUES);
	const speedCutoffSlider = createSliderHandler(SPEED_CUTOFF_VALUES);
	const segmentLengthHandler = createSegmentLengthHandler(MIN_SEGMENT_LENGTH_KM, MAX_SEGMENT_LENGTH_KM, SEGMENT_LENGTH_SLIDER_STEPS);

	// Check if view parameters differ from defaults (indicating URL parameters were provided)
	const hasViewParams = (
		state.lat !== DEFAULT_VIEW.lat ||
		state.lng !== DEFAULT_VIEW.lng ||
		state.zoom !== DEFAULT_VIEW.zoom
	);

	// Normalize map source to ensure it matches available options
	const normalizedMapSource = normalizeMapSource(state.mapSource, MAP_SOURCES, DEFAULT_STATE.mapSource);

	// Load per-track settings from URL
	const trackIds = Array.isArray(state.ids) ? state.ids : [];
	const trackSettings = readPerTrackParams(trackIds, baseColor, state.breakHours, colorEnabled, urlStateOptions.perTrackAlias);

	// Create a new state object with all normalized values for template binding
	const appState = {
		...state,
		ids: trackIds,
		mapSource: normalizedMapSource,
		colorEnabled,
		baseColor
	};

	return {
		mapSources: MAP_SOURCES,
		menuOpen,
		hasInitializedMenu: false,
		state: appState,
		pendingId: "",
		trackSettings,
		trackData: {}, // Store loaded track events by ID
		mapStatus: "",
		showMapStatusModal: false,
		hutData: [],
		breakHourOptions: BREAK_HOUR_VALUES,
		speedCutoffOptions: SPEED_CUTOFF_VALUES,
		segmentLengthSliderSteps: SEGMENT_LENGTH_SLIDER_STEPS,
		hasUserAdjustedView: hasViewParams,
		initialViewFromUrl: hasViewParams,

		// Managers
		stateManager,
		colorManager,
		mapManager,
		breakHoursSlider,
		speedCutoffSlider,
		segmentLengthHandler,

		init() {
			this.pendingId = "";
			
			// Defensive: ensure trackSettings has an entry for every ID
			// (should already be populated by readPerTrackParams, but just in case)
			if (this.state.ids && this.state.ids.length > 0) {
				this.state.ids.forEach(item => {
					const id = typeof item === 'string' ? item : item.id;
					if (!this.trackSettings[id]) {
						console.warn(`trackSettings missing for ${id}, initializing with defaults`);
						const enabled = typeof item === 'string' ? true : item.enabled;
						this.trackSettings[id] = {
							enabled,
							color: this.state.baseColor,
							breakHours: this.state.breakHours,
							colorEnabled: this.state.colorEnabled
						};
					}
				});
			}
			
			if (!this.state.ids || this.state.ids.length === 0) {
				this.setMapStatus("Enter an ID to load a track.", false);
				this.ensureMenuOpen();
			} else {
				this.setMapStatus("", false);
			}
			this.setupMap();
			this.$nextTick(() => {
				this.mapManager.invalidateSize();
				this.hasInitializedMenu = true;
			});
			if (this.state.ids && this.state.ids.length > 0) {
				this.loadTracks();
			}
			this.loadHutsAsync();
		},

		setMapStatus(message, showModal = false) {
			this.mapStatus = message;
			this.showMapStatusModal = showModal;
		},

		setMenuOpen(isOpen) {
			this.menuOpen = isOpen;
			this.stateManager.persistMenuState(isOpen);
			this.$nextTick(() => this.mapManager.invalidateSize());
		},

		toggleMenu() {
			this.setMenuOpen(!this.menuOpen);
		},

		ensureMenuOpen() {
			if (!this.menuOpen) {
				this.setMenuOpen(true);
			}
		},

		applyId() {
			const trimmed = (this.pendingId || "").trim();
			if (!trimmed) {
				this.setMapStatus("Please enter a valid track id.", true);
				this.ensureMenuOpen();
				return;
			}

			// Check if ID already exists
			const existingIds = this.state.ids.map(item => typeof item === 'string' ? item : item.id);
			if (existingIds.includes(trimmed)) {
				this.setMapStatus("Track ID already exists.", true);
				this.pendingId = "";
				return;
			}

			// Add the new ID to the list
			this.state.ids = [...this.state.ids, { id: trimmed, enabled: true }];
			
			// Initialize settings for the new track
			this.trackSettings[trimmed] = {
				enabled: true,
				color: this.state.baseColor,
				breakHours: this.state.breakHours,
				colorEnabled: this.state.colorEnabled
			};
			
			this.stateManager.persistState({ ids: this.state.ids });
			writePerTrackParams(this.trackSettings, urlStateOptions.perTrackAlias);
			this.loadTracks();
			
			this.pendingId = "";
		},

		setupMap() {
			const container = this.$refs.map;
			if (!container) {
				return;
			}

			// MapManager.initialize will set the initial view from this.state (which includes URL params)
			this.mapManager.initialize(container, this.state, MAP_SOURCES, this.state.mapSource);

			this.mapManager.onViewChange = (viewData) => {
				this.state.lat = viewData.lat;
				this.state.lng = viewData.lng;
				this.state.zoom = viewData.zoom;
				this.stateManager.persistState({
					lat: viewData.lat,
					lng: viewData.lng,
					zoom: viewData.zoom
				});

				if (!viewData.isProgrammatic) {
					this.hasUserAdjustedView = true;
				}
			};
		},

		updateMapSource() {
			this.state.mapSource = normalizeMapSource(this.state.mapSource, MAP_SOURCES, DEFAULT_STATE.mapSource);
			this.mapManager.updateTileLayer(MAP_SOURCES, this.state.mapSource);
			this.stateManager.persistState({ mapSource: this.state.mapSource });
			this.renderTrackData();
		},

		setColorMode(enabled) {
			const next = Boolean(enabled);
			if (this.state.colorEnabled !== next) {
				this.state.colorEnabled = next;
				this.colorManager.setColorMode(next, this.state.baseColor);
				this.renderTrackData();
			}
		},

		setShowHuts(value) {
			const flag = Boolean(value);
			if (this.state.showHuts === flag) {
				return;
			}

			this.state.showHuts = flag;
			this.stateManager.persistState({ showHuts: flag ? "true" : "false" });
			this.updateHutVisibility();
		},

		updateHutVisibility() {
			if (this.state.showHuts) {
				this.mapManager.showHutLayer();
			} else {
				this.mapManager.hideHutLayer();
			}
		},

		centerMap() {
			// Re-render track data which will fit bounds to all points
			this.hasUserAdjustedView = false;
			this.renderTrackData();
		},

		toggleTrack(trackId) {
			if (this.trackSettings[trackId]) {
				this.trackSettings[trackId].enabled = !this.trackSettings[trackId].enabled;
				
				// Update the enabled state in the ids array
				this.state.ids = this.state.ids.map(item => {
					const id = typeof item === 'string' ? item : item.id;
					if (id === trackId) {
						return { id, enabled: this.trackSettings[trackId].enabled };
					}
					return item;
				});
				
				this.stateManager.persistState({ ids: this.state.ids });
				writePerTrackParams(this.trackSettings, urlStateOptions.perTrackAlias);
				this.renderTrackData();
			}
		},

		deleteTrack(trackId) {
			if (!confirm(`Delete track "${trackId}"? This cannot be undone.`)) {
				return;
			}

			// Remove from ids array
			this.state.ids = this.state.ids.filter(item => {
				const id = typeof item === 'string' ? item : item.id;
				return id !== trackId;
			});

			// Remove from trackSettings
			delete this.trackSettings[trackId];

			// Remove from trackData
			delete this.trackData[trackId];

			this.stateManager.persistState({ ids: this.state.ids });
			writePerTrackParams(this.trackSettings, urlStateOptions.perTrackAlias);
			this.renderTrackData();
		},

		updateTrackColor(trackId) {
			if (this.trackSettings[trackId]) {
				writePerTrackParams(this.trackSettings, urlStateOptions.perTrackAlias);
				this.renderTrackData();
			}
		},

		setTrackColorMode(trackId, enabled) {
			if (this.trackSettings[trackId]) {
				this.trackSettings[trackId].colorEnabled = enabled;
				writePerTrackParams(this.trackSettings, urlStateOptions.perTrackAlias);
				this.renderTrackData();
			}
		},

		getTrackBreakHoursIndex(trackId) {
			if (!this.trackSettings[trackId]) return 0;
			return this.breakHoursSlider.getIndex(this.trackSettings[trackId].breakHours);
		},

		setTrackBreakHours(trackId, rawIndex) {
			if (this.trackSettings[trackId]) {
				this.trackSettings[trackId].breakHours = this.breakHoursSlider.setValue(rawIndex);
				writePerTrackParams(this.trackSettings, urlStateOptions.perTrackAlias);
				this.renderTrackData();
			}
		},

		breakHoursIndex() {
			return this.breakHoursSlider.getIndex(this.state.breakHours);
		},

		setBreakHours(rawIndex) {
			this.state.breakHours = this.breakHoursSlider.setValue(rawIndex);
			this.stateManager.persistState({ breakHours: this.state.breakHours });
			this.renderTrackData();
		},

		formatBreakHours(hours) {
			return formatBreakHours(hours);
		},

		speedCutoffIndex() {
			return this.speedCutoffSlider.getIndex(this.state.speedCutoff);
		},

		setSpeedCutoff(rawIndex) {
			this.state.speedCutoff = this.speedCutoffSlider.setValue(rawIndex);
			this.stateManager.persistState({ speedCutoff: this.state.speedCutoff });
			this.renderTrackData();
		},

		segmentLengthSliderValue() {
			return this.segmentLengthHandler.getSliderValue(this.state.segmentLengthLimitKm);
		},

		setSegmentLengthLimit(rawValue) {
			this.state.segmentLengthLimitKm = this.segmentLengthHandler.getKmValue(rawValue);
			this.stateManager.persistState({ segmentLengthLimitKm: this.state.segmentLengthLimitKm });
			this.renderTrackData();
		},

		formatSegmentLength(kilometers) {
			return formatSegmentLength(kilometers);
		},

		updateBaseColor() {
			this.colorManager.updateBaseColor(this.state.baseColor);
			this.renderTrackData();
		},

		loadTracks() {
			if (!this.state.ids || this.state.ids.length === 0) {
				this.setMapStatus("Enter an ID to load a track.", false);
				this.ensureMenuOpen();
				return;
			}

			const trackIdList = this.state.ids.map(item => typeof item === 'string' ? item : item.id);
			
			// Only load tracks that haven't been loaded yet
			const tracksToLoad = trackIdList.filter(id => !this.trackData[id] || this.trackData[id].length === 0);
			
			if (tracksToLoad.length === 0) {
				// All tracks already loaded, just re-render
				this.renderTrackData();
				return;
			}

			this.setMapStatus(`Loading ${tracksToLoad.length} track(s)…`, true);

			let baseUrl = readCookie("baseUrl") || "";
			
			const loadPromises = tracksToLoad.map(id => 
				fetch(`${baseUrl}/Himinbjorg/Track?id=${encodeURIComponent(id)}`, {
					method: "GET"
				})
					.then((response) => {
						if (response.status === 403) {
							throw new Error(`403 - Access denied for ${id}`);
						}
						if (response.status === 404) {
							throw new Error(`404 - Track ${id} not found`);
						}
						if (!response.ok) {
							throw new Error(`Failed to load track ${id}`);
						}
						return response.json();
					})
					.then((data) => {
						this.trackData[id] = Array.isArray(data) ? data : [];
						return { id, success: true, count: this.trackData[id].length };
					})
					.catch((error) => {
						this.trackData[id] = [];
						return { id, success: false, error: error.message };
					})
			);

			Promise.all(loadPromises)
				.then((results) => {
					const successCount = results.filter(r => r.success).length;
					const totalEvents = results.reduce((sum, r) => sum + (r.count || 0), 0);
					
					if (successCount === 0) {
						this.setMapStatus("Failed to load any tracks.", true);
					} else if (successCount < results.length) {
						this.setMapStatus(`Loaded ${successCount}/${results.length} tracks (${totalEvents} events).`, false);
					} else {
						this.setMapStatus(`${totalEvents} events loaded from ${successCount} tracks.`, false);
					}
					
					// Only reset hasUserAdjustedView if we didn't have view params initially
					if (!this.hasUserAdjustedView) {
						this.hasUserAdjustedView = this.initialViewFromUrl;
					}
					this.initialViewFromUrl = false;
					this.renderTrackData();
				})
				.catch((error) => {
					this.setMapStatus(error.message || "Something went wrong.", true);
					this.ensureMenuOpen();
					this.mapManager.clearTrackLayers();
				});
		},

		renderTrackData() {
			this.mapManager.clearTrackLayers();

			let totalPointsRendered = 0;
			const allBounds = [];

			const trackIdList = this.state.ids.map(item => typeof item === 'string' ? item : item.id);
			
			trackIdList.forEach(trackId => {
				const trackEvents = this.trackData[trackId] || [];
				const settings = this.trackSettings[trackId];
				
				if (!settings) {
					console.warn(`No settings for track ${trackId}`);
					return;
				}
				if (!settings.enabled) {
					return;
				}
				if (trackEvents.length === 0) {
					console.info(`No data yet for track ${trackId}`);
					return;
				}

				const result = renderTrack(this.mapManager, trackEvents, {
					breakHours: settings.breakHours,
					speedCutoff: this.state.speedCutoff,
					segmentLengthLimitKm: this.state.segmentLengthLimitKm,
					minSegmentLengthKm: MIN_SEGMENT_LENGTH_KM,
					maxSegmentLengthKm: MAX_SEGMENT_LENGTH_KM,
					colorEnabled: settings.colorEnabled,
					baseColor: settings.color,
					hasUserAdjustedView: this.hasUserAdjustedView,
					skipFitBounds: true  // We'll fit all bounds together at the end
				});

				totalPointsRendered += result.pointsRendered;
				if (result.bounds) {
					allBounds.push(result.bounds);
				}
			});

			// Fit bounds to include all tracks
			if (allBounds.length > 0 && !this.hasUserAdjustedView) {
				const L = this.mapManager.getLeaflet();
				const combinedBounds = L.latLngBounds([]);
				allBounds.forEach(bounds => {
					combinedBounds.extend(bounds);
				});
				if (combinedBounds.isValid()) {
					this.mapManager.fitBounds(combinedBounds);
				}
			}

			if (totalPointsRendered === 0) {
				this.setMapStatus("No tracks to display.", false);
			} else {
				this.setMapStatus(`${totalPointsRendered} points rendered.`, false);
			}
		},

		async loadHutsAsync() {
			try {
				this.hutData = await loadHuts("./data/hytter.csv");
				renderHuts(this.mapManager, this.hutData, "./assets/hut.png");
				if (this.state.showHuts) {
					this.mapManager.showHutLayer();
				}
			} catch (error) {
				console.warn(error.message);
			}
		}
	};
};

document.addEventListener("alpine:init", () => {
	if (!window.Alpine) {
		return;
	}
	window.Alpine.data("app", createAppState);
});

// Provide a global fallback so x-data="app()" keeps working even if Alpine
// evaluates before the alpine:init hook fires.
window.app = createAppState;

// Helper function for debugging using a locally served backend on a different port. Call this method once from the browser console.
// Example: setBaseUrl("http://localhost:1339")
window.setBaseUrl = (url) => {
	window.baseUrl = url;
	setCookie("baseUrl", url, 365);
};