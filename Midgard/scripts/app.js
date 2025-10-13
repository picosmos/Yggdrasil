import { normalizeMapSource } from "./url.js";
import { MapManager } from "./mapManager.js";
import { ColorManager } from "./colorManager.js";
import { StateManager } from "./stateManager.js";
import { createSliderHandler, formatBreakHours, formatSegmentLength, createSegmentLengthHandler } from "./sliders.js";
import { renderTrack } from "./trackRenderer.js";
import { renderHuts, loadHuts } from "./hutRenderer.js";

const BREAK_HOUR_VALUES = [
	...Array.from({ length: 12 }, (_, index) => 0.25 + index * 0.25),
	...Array.from({ length: 21 }, (_, index) => 4 + index),
	...Array.from({ length: 8 }, (_, index) => 30 + index * 6)
];

const SPEED_CUTOFF_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 50, 80, 100, 130];

const MIN_SEGMENT_LENGTH_KM = 0.1;
const MAX_SEGMENT_LENGTH_KM = 50;
const SEGMENT_LENGTH_SLIDER_STEPS = 120;

const MAP_SOURCES = [
	{
		key: "kartverket",
		label: "Kartverket",
		url: "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
		options: { maxZoom: 18, attribution: '&copy; <a href="http://www.kartverket.no/">Kartverket</a>' }
	},
	{
		key: "osm",
		label: "Classic",
		url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		options: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }
	},
	{
		key: "opentpo",
		label: "Topo",
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
	id: "",
	mapSource: MAP_SOURCES[0].key,
	breakHours: 3.0,
	speedCutoff: 8.0,
	lat: DEFAULT_VIEW.lat,
	lng: DEFAULT_VIEW.lng,
	zoom: DEFAULT_VIEW.zoom,
	segmentLengthLimitKm: 1.0,
	showHuts: true
};

const urlStateOptions = {
	alias: { 
		mapSource: "src",
		breakHours: "bh",
		speedCutoff: "sco",
		zoom: "z",
		segmentLengthLimitKm: "sll",
		showHuts: "hts"
	},
	numberKeys: ["breakHours", "speedCutoff", "lat", "lng", "zoom", "segmentLengthLimitKm"],
	booleanKeys: ["showHuts"],
	persistedKeys: ["id", "mapSource", "breakHours", "speedCutoff", "lat", "lng", "zoom", "segmentLengthLimitKm", "showHuts"]
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

	// Create a new state object with all normalized values for template binding
	const appState = {
		...state,
		mapSource: normalizedMapSource,
		colorEnabled,
		baseColor
	};

	return {
		mapSources: MAP_SOURCES,
		menuOpen,
		hasInitializedMenu: false,
		state: appState,
		pendingId: appState.id,
		hasError: false,
		errorMessage: "",
		mapStatus: "",
		trackEvents: [],
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
			this.pendingId = this.state.id;
			if (!this.state.id) {
				this.mapStatus = "Enter an ID to load a track.";
				this.ensureMenuOpen();
			} else {
				this.mapStatus = "";
			}
			this.setupMap();
			this.$nextTick(() => {
				this.mapManager.invalidateSize();
				this.hasInitializedMenu = true;
			});
			if (this.state.id) {
				this.loadTrack();
			}
			this.loadHutsAsync();
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
				this.errorMessage = "Please enter a valid track id.";
				this.hasError = true;
				this.mapStatus = this.errorMessage;
				this.ensureMenuOpen();
				return;
			}

			this.hasError = false;
			this.errorMessage = "";
			this.state.id = trimmed;
			this.stateManager.persistState({ id: trimmed });
			this.loadTrack();
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

		loadTrack() {
			if (!this.state.id) {
				this.mapStatus = "Enter an ID to load a track.";
				this.ensureMenuOpen();
				return;
			}

			this.mapStatus = "Loading track…";
			this.hasError = false;
			this.errorMessage = "";

			fetch(`/Himinbjorg/Track?id=${encodeURIComponent(this.state.id)}`, {
				method: "GET"
			})
				.then((response) => {
					if (response.status === 403) {
						throw new Error("403 - Access denied");
					}
					if (response.status === 404) {
						throw new Error("404 - Track not found");
					}
					if (!response.ok) {
						throw new Error("Failed to load track");
					}
					return response.json();
				})
				.then((data) => {
					this.trackEvents = Array.isArray(data) ? data : [];
					if (this.trackEvents.length === 0) {
						this.mapStatus = "No track points available.";
					} else {
						this.mapStatus = `${this.trackEvents.length} events loaded.`;
					}
					// Only reset hasUserAdjustedView if we didn't have view params initially
					// This prevents fitBounds from overriding URL-specified positions
					if (!this.hasUserAdjustedView) {
						this.hasUserAdjustedView = this.initialViewFromUrl;
					}
					this.initialViewFromUrl = false;
					this.renderTrackData();
				})
				.catch((error) => {
					this.hasError = true;
					this.errorMessage = error.message || "Something went wrong.";
					this.mapStatus = this.errorMessage;
					this.ensureMenuOpen();
					this.mapManager.clearTrackLayers();
				});
		},

		renderTrackData() {
			const result = renderTrack(this.mapManager, this.trackEvents, {
				breakHours: this.state.breakHours,
				speedCutoff: this.state.speedCutoff,
				segmentLengthLimitKm: this.state.segmentLengthLimitKm,
				minSegmentLengthKm: MIN_SEGMENT_LENGTH_KM,
				maxSegmentLengthKm: MAX_SEGMENT_LENGTH_KM,
				colorEnabled: this.state.colorEnabled,
				baseColor: this.state.baseColor,
				hasUserAdjustedView: this.hasUserAdjustedView
			});

			this.mapStatus = result.message;
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
