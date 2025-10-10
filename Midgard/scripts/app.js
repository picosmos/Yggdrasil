import * as Leaflet from "../node_modules/leaflet/dist/leaflet-src.esm.js";
import { makeColorScale } from "./colors.js";
import { normalizeMapSource, readUrlState, writeUrlState } from "./url.js";
import { prepareTrackPoints } from "./trackpoints.js";
import { distanceBetweenPoints } from "./coordinates.js";

const L = Leaflet;

const DEFAULT_BASE_COLOR = "#0077cc";
const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

const COOKIE_KEYS = {
	menuOpen: "midgard_menu_open",
	shenanigansColor: "midgard_shenanigans_color"
};

const COOKIE_TTL_DAYS = 30;

const setCookie = (key, value, days = COOKIE_TTL_DAYS) => {
	if (typeof document === "undefined") {
		return;
	}

	const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
	const encoded = encodeURIComponent(value ?? "");
	document.cookie = `${key}=${encoded}; expires=${expires.toUTCString()}; path=/`;
};

const readCookie = (key) => {
	if (typeof document === "undefined") {
		return null;
	}

	const cookies = document.cookie.split(";").map((entry) => entry.trim());
	for (const cookie of cookies) {
		if (!cookie) {
			continue;
		}
		const [name, ...rest] = cookie.split("=");
		if (name === key) {
			return decodeURIComponent(rest.join("="));
		}
	}

	return null;
};

const sanitizeHexColor = (value, fallback = DEFAULT_BASE_COLOR) => {
	if (typeof value !== "string") {
		return fallback;
	}

	let next = value.trim();
	if (!next) {
		return fallback;
	}

	if (!next.startsWith("#")) {
		next = `#${next}`;
	}

	if (!HEX_COLOR_PATTERN.test(next)) {
		return fallback;
	}

	return next.toLowerCase();
};

const readColorToken = () => {
	if (typeof window === "undefined") {
		return "";
	}

	const params = new URLSearchParams(window.location.search);
	return params.get("color") ?? "";
};

const writeColorToken = (token) => {
	if (typeof window === "undefined") {
		return;
	}

	const url = new URL(window.location.href);
	if (!token) {
		url.searchParams.delete("color");
	} else {
		url.searchParams.set("color", token);
	}

	window.history.replaceState({}, "", url.toString());
};

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
	colorEnabled: false,
	breakHours: 4,
	speedCutoff: 130,
	baseColor: DEFAULT_BASE_COLOR,
	lat: DEFAULT_VIEW.lat,
	lng: DEFAULT_VIEW.lng,
	zoom: DEFAULT_VIEW.zoom,
	segmentLengthLimitKm: MAX_SEGMENT_LENGTH_KM,
	showHuts: true
};

const urlStateOptions = {
	alias: { mapSource: "src" },
	numberKeys: ["breakHours", "speedCutoff", "lat", "lng", "zoom", "segmentLengthLimitKm"],
	booleanKeys: ["showHuts"],
	persistedKeys: ["id", "mapSource", "breakHours", "speedCutoff", "lat", "lng", "zoom", "segmentLengthLimitKm", "showHuts"]
};

const getInitialState = () => {
	const state = readUrlState(DEFAULT_STATE, urlStateOptions);
	const colorToken = readColorToken();
	const menuCookie = readCookie(COOKIE_KEYS.menuOpen);
	const shenanigansColorCookie = readCookie(COOKIE_KEYS.shenanigansColor);

	let colorEnabled = false;
	let baseColor = DEFAULT_BASE_COLOR;
	let menuOpen = false;

	if (typeof menuCookie === "string" && menuCookie.length > 0) {
		menuOpen = menuCookie === "1";
	}

	if (typeof colorToken === "string" && colorToken) {
		if (colorToken.toLowerCase() === "shenanigans") {
			colorEnabled = true;
			const sanitized = sanitizeHexColor(shenanigansColorCookie ?? DEFAULT_BASE_COLOR, DEFAULT_BASE_COLOR);
			baseColor = sanitized;
		} else {
			baseColor = sanitizeHexColor(colorToken, DEFAULT_BASE_COLOR);
		}
	} else if (typeof shenanigansColorCookie === "string" && shenanigansColorCookie) {
		baseColor = sanitizeHexColor(shenanigansColorCookie, DEFAULT_BASE_COLOR);
	}

	return {
		...DEFAULT_STATE,
		...state,
		mapSource: normalizeMapSource(state.mapSource, MAP_SOURCES, DEFAULT_STATE.mapSource),
		baseColor,
		colorEnabled,
		menuOpen
	};
};

const createAppState = () => {
	const initialState = getInitialState();
	const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
	const initialViewFromUrl = Boolean(searchParams && (searchParams.has("lat") || searchParams.has("lng") || searchParams.has("zoom")));

	return {
		mapSources: MAP_SOURCES,
		menuOpen: initialState.menuOpen,
		hasInitializedMenu: false,
		state: initialState,
		pendingId: "",
		hasError: false,
		errorMessage: "",
		mapStatus: "",
		mapInstance: null,
		tileLayer: null,
		trackLayer: null,
		pointLayer: null,
		hutLayer: null,
		hutData: [],
		trackEvents: [],
		breakHourOptions: BREAK_HOUR_VALUES,
		speedCutoffOptions: SPEED_CUTOFF_VALUES,
		segmentLengthSliderSteps: SEGMENT_LENGTH_SLIDER_STEPS,
		isProgrammaticMove: false,
		hasUserAdjustedView: initialViewFromUrl,
		initialViewFromUrl,

		init() {
			this.menuOpen = this.state.menuOpen;
			this.pendingId = this.state.id;
			if (!this.state.id) {
				this.mapStatus = "Enter an ID to load a track.";
				this.ensureMenuOpen();
			} else {
				this.mapStatus = "";
			}
			this.setupMap();
			this.$nextTick(() => {
				if (this.mapInstance) {
					this.mapInstance.invalidateSize();
				}
				this.hasInitializedMenu = true;
			});
			if (this.state.id) {
				this.loadTrack();
			}
			this.loadHuts();
			setCookie(COOKIE_KEYS.menuOpen, this.menuOpen ? "1" : "0");
		},

		toggleMenu() {
			this.menuOpen = !this.menuOpen;
			this.state.menuOpen = this.menuOpen;
			setCookie(COOKIE_KEYS.menuOpen, this.menuOpen ? "1" : "0");
			this.$nextTick(() => {
				if (this.mapInstance) {
					this.mapInstance.invalidateSize();
				}
			});
		},

		ensureMenuOpen() {
			if (this.menuOpen) {
				return;
			}
			this.menuOpen = true;
			this.state.menuOpen = true;
			setCookie(COOKIE_KEYS.menuOpen, "1");
			this.$nextTick(() => {
				if (this.mapInstance) {
					this.mapInstance.invalidateSize();
				}
			});
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
			writeUrlState(DEFAULT_STATE, { id: trimmed }, urlStateOptions);
			this.loadTrack();
		},

		withProgrammaticMove(action) {
			this.isProgrammaticMove = true;
			try {
				action();
			} finally {
				setTimeout(() => {
					this.isProgrammaticMove = false;
				}, 0);
			}
		},

		setupMap() {
			if (this.mapInstance) {
				return;
			}

			const container = this.$refs.map;
			if (!container) {
				return;
			}

			if (container._leaflet_id) {
				container._leaflet_id = null;
			}

			const mapOptions = {
				center: [this.state.lat, this.state.lng],
				zoom: this.state.zoom,
				zoomControl: true
			};

			this.mapInstance = L.map(container, mapOptions);
			this.updateTileLayer();
			if (!this.initialViewFromUrl) {
				this.restoreView();
			}

			this.trackLayer = L.layerGroup().addTo(this.mapInstance);
			this.pointLayer = L.layerGroup().addTo(this.mapInstance);

			// cspell:ignore: moveend
			this.mapInstance.on("moveend", () => {
				const center = this.mapInstance.getCenter();
				const zoom = this.mapInstance.getZoom();
				this.state.lat = Number(center.lat.toFixed(5));
				this.state.lng = Number(center.lng.toFixed(5));
				this.state.zoom = zoom;
				writeUrlState(DEFAULT_STATE, { lat: this.state.lat, lng: this.state.lng, zoom }, urlStateOptions);

				if (!this.isProgrammaticMove) {
					this.hasUserAdjustedView = true;
				}
			});

			L.control.scale().addTo(this.mapInstance);
		},

		updateTileLayer() {
			const source = MAP_SOURCES.find((item) => item.key === this.state.mapSource) ?? MAP_SOURCES[0];

			if (this.tileLayer) {
				this.tileLayer.remove();
			}

			this.tileLayer = L.tileLayer(source.url, source.options);
			this.tileLayer.addTo(this.mapInstance);
			this.restoreView();
			writeUrlState(DEFAULT_STATE, { mapSource: source.key }, urlStateOptions);
		},

		updateMapSource() {
			this.state.mapSource = normalizeMapSource(this.state.mapSource, MAP_SOURCES, DEFAULT_STATE.mapSource);
			this.updateTileLayer();
			this.renderTrack();
		},

		restoreView() {
			if (!this.mapInstance) {
				return;
			}

			this.withProgrammaticMove(() => {
				this.mapInstance.setView([this.state.lat, this.state.lng], this.state.zoom, { animate: false });
			});
		},

		setColorMode(enabled) {
			const next = Boolean(enabled);
			if (this.state.colorEnabled !== next) {
				this.state.colorEnabled = next;
				this.syncColorParam();
				this.renderTrack();
				return;
			}

			this.syncColorParam();
		},

		syncColorParam() {
			if (this.state.colorEnabled) {
				setCookie(COOKIE_KEYS.shenanigansColor, this.state.baseColor);
				writeColorToken("shenanigans");
				return;
			}

			this.state.baseColor = sanitizeHexColor(this.state.baseColor, DEFAULT_BASE_COLOR);
			setCookie(COOKIE_KEYS.shenanigansColor, this.state.baseColor);
			if (this.state.baseColor === DEFAULT_BASE_COLOR) {
				writeColorToken("");
			} else {
				writeColorToken(this.state.baseColor);
			}
		},

		setShowHuts(value) {
			const flag = Boolean(value);
			if (this.state.showHuts === flag) {
				this.updateHutVisibility();
				return;
			}

			this.state.showHuts = flag;
			writeUrlState(DEFAULT_STATE, { showHuts: flag ? "true" : "false" }, urlStateOptions);
			this.updateHutVisibility();
		},

		updateHutVisibility() {
			if (!this.mapInstance || !this.hutLayer) {
				return;
			}

			if (this.state.showHuts) {
				if (!this.mapInstance.hasLayer(this.hutLayer)) {
					this.hutLayer.addTo(this.mapInstance);
				}
			} else {
				this.hutLayer.remove();
			}
		},

		breakHoursIndex() {
			const current = this.state.breakHours;
			const matchIndex = this.breakHourOptions.findIndex((value) => value === current);
			if (matchIndex !== -1) {
				return matchIndex;
			}

			let nearestIndex = 0;
			let smallestDiff = Number.POSITIVE_INFINITY;
			this.breakHourOptions.forEach((value, index) => {
				const diff = Math.abs(value - current);
				if (diff < smallestDiff) {
					smallestDiff = diff;
					nearestIndex = index;
				}
			});
			return nearestIndex;
		},

		setBreakHours(rawIndex) {
			const index = Math.round(Number(rawIndex));
			const clampedIndex = Math.min(Math.max(index, 0), this.breakHourOptions.length - 1);
			this.state.breakHours = this.breakHourOptions[clampedIndex];
			this.updateBreakHours();
		},

		formatBreakHours(hours) {
			const totalMinutes = Math.round(hours * 60);
			const wholeHours = Math.floor(totalMinutes / 60);
			const remainingMinutes = totalMinutes % 60;
			const parts = [];
			if (wholeHours > 0) {
				parts.push(`${wholeHours}h`);
			}
			if (remainingMinutes > 0) {
				parts.push(`${remainingMinutes}min`);
			}
			if (parts.length === 0) {
				return "0 min";
			}
			return parts.join(" ");
		},

		speedCutoffIndex() {
			const current = this.state.speedCutoff;
			const matchIndex = this.speedCutoffOptions.findIndex((value) => value === current);
			if (matchIndex !== -1) {
				return matchIndex;
			}

			let nearestIndex = 0;
			let smallestDiff = Number.POSITIVE_INFINITY;
			this.speedCutoffOptions.forEach((value, index) => {
				const diff = Math.abs(value - current);
				if (diff < smallestDiff) {
					smallestDiff = diff;
					nearestIndex = index;
				}
			});
			return nearestIndex;
		},

		setSpeedCutoff(rawIndex) {
			const index = Math.round(Number(rawIndex));
			const clampedIndex = Math.min(Math.max(index, 0), this.speedCutoffOptions.length - 1);
			this.state.speedCutoff = this.speedCutoffOptions[clampedIndex];
			this.updateSpeedCutoff();
		},

		segmentLengthSliderValue() {
			const value = Math.max(MIN_SEGMENT_LENGTH_KM, Math.min(this.state.segmentLengthLimitKm ?? MAX_SEGMENT_LENGTH_KM, MAX_SEGMENT_LENGTH_KM));
			const ratio = Math.log(value / MIN_SEGMENT_LENGTH_KM) / Math.log(MAX_SEGMENT_LENGTH_KM / MIN_SEGMENT_LENGTH_KM);
			if (!Number.isFinite(ratio)) {
				return this.segmentLengthSliderSteps;
			}
			return Math.round(ratio * this.segmentLengthSliderSteps);
		},

		setSegmentLengthLimit(rawValue) {
			const sliderPosition = Math.max(0, Math.min(Number(rawValue), this.segmentLengthSliderSteps));
			const ratio = sliderPosition / this.segmentLengthSliderSteps;
			const rawKm = MIN_SEGMENT_LENGTH_KM * ((MAX_SEGMENT_LENGTH_KM / MIN_SEGMENT_LENGTH_KM) ** ratio);
			const roundedKm = Math.round(rawKm * 10) / 10;
			const constrainedKm = Math.max(MIN_SEGMENT_LENGTH_KM, Math.min(roundedKm, MAX_SEGMENT_LENGTH_KM));
			this.state.segmentLengthLimitKm = constrainedKm;
			writeUrlState(DEFAULT_STATE, { segmentLengthLimitKm: this.state.segmentLengthLimitKm }, urlStateOptions);
			this.renderTrack();
		},

		formatSegmentLength(kilometers) {
			const km = Number(kilometers);
			if (!Number.isFinite(km)) {
				return "n/a";
			}
			if (km >= 10) {
				return `${Math.round(km)}km`;
			}
			if (km >= 3) {
				return `${km.toFixed(1)}km`;
			}
			return `${Math.round(km * 1000)}m`;
		},

		updateBreakHours() {
			writeUrlState(DEFAULT_STATE, { breakHours: this.state.breakHours }, urlStateOptions);
			this.renderTrack();
		},

		updateSpeedCutoff() {
			writeUrlState(DEFAULT_STATE, { speedCutoff: this.state.speedCutoff }, urlStateOptions);
			this.renderTrack();
		},

		updateBaseColor() {
			this.state.baseColor = sanitizeHexColor(this.state.baseColor, DEFAULT_BASE_COLOR);
			setCookie(COOKIE_KEYS.shenanigansColor, this.state.baseColor);
			if (!this.state.colorEnabled) {
				this.syncColorParam();
			}
			this.renderTrack();
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
					this.hasUserAdjustedView = this.initialViewFromUrl;
					this.initialViewFromUrl = false;
					this.renderTrack();
				})
				.catch((error) => {
					this.hasError = true;
					this.errorMessage = error.message || "Something went wrong.";
					this.mapStatus = this.errorMessage;
					this.ensureMenuOpen();
					this.clearTrackLayers();
				});
		},

		clearTrackLayers() {
			if (this.trackLayer) {
				this.trackLayer.clearLayers();
			}
			if (this.pointLayer) {
				this.pointLayer.clearLayers();
			}
		},

		renderTrack() {
			if (!this.mapInstance) {
				return;
			}

			this.clearTrackLayers();

			if (!Array.isArray(this.trackEvents) || this.trackEvents.length === 0) {
				return;
			}

			const points = prepareTrackPoints(this.trackEvents, { breakHours: this.state.breakHours });
			if (points.length === 0) {
				this.mapStatus = "No usable points.";
				return;
			}

			const colorScale = makeColorScale(this.state.colorEnabled, this.state.baseColor);
			const groups = Object.values(points.reduce((acc, point) => {
				const key = point.groupId ?? 0;
				if (!acc[key]) {
					acc[key] = [];
				}
				acc[key].push(point);
				return acc;
			}, {}));

			const speedLimit = this.state.speedCutoff;
			const segmentLimitKm = Math.max(
				MIN_SEGMENT_LENGTH_KM,
				Math.min(this.state.segmentLengthLimitKm ?? MAX_SEGMENT_LENGTH_KM, MAX_SEGMENT_LENGTH_KM)
			);
			const maxSegmentLengthMeters = segmentLimitKm * 1000;

			groups.forEach((group) => {
				const groupColor = colorScale(group[0].groupId ?? 0);
				const segments = [];
				let currentSegment = [];
				let previousPoint = null;

				group.forEach((point) => {
					const withinSpeedLimit = !Number.isFinite(point.speed) || point.speed < speedLimit;
					if (!withinSpeedLimit) {
						if (currentSegment.length > 1) {
							segments.push(currentSegment);
						}
						currentSegment = [];
						previousPoint = null;
						return;
					}

					if (!previousPoint) {
						currentSegment = [point];
						previousPoint = point;
						return;
					}

					const separation = distanceBetweenPoints(previousPoint, point);
					if (separation > maxSegmentLengthMeters) {
						if (currentSegment.length > 1) {
							segments.push(currentSegment);
						}
						currentSegment = [point];
						previousPoint = point;
						return;
					}

					currentSegment.push(point);
					previousPoint = point;
				});

				if (currentSegment.length > 1) {
					segments.push(currentSegment);
				}

				segments.forEach((segment) => {
					if (segment.length < 2) {
						return;
					}
					const polyline = L.polyline(segment.map((point) => [point.lat, point.lon]), {
						color: groupColor,
						weight: 3,
						opacity: 0.7
					});
					polyline.addTo(this.trackLayer);
				});

				group.forEach((point) => {
					const colorValue = colorScale(point.groupId ?? 0);
					const marker = L.circleMarker([point.lat, point.lon], {
						radius: Number.isFinite(point.speed) && point.speed >= speedLimit ? 3 : 5,
						color: colorValue,
						fillColor: colorValue,
						fillOpacity: 0.85,
						weight: 1
					});

					const timeFormatter = new Intl.DateTimeFormat("en-GB", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
						timeZone: "Europe/Oslo",
						timeZoneName: "short"
					});

					const formattedTime = timeFormatter.format(point.time).replace(",", "");
					const speedInfo = Number.isFinite(point.speed) ? `${point.speed.toFixed(1)}km/h` : "n/a";
					marker.bindPopup(`Time: ${formattedTime}<br />Speed: ${speedInfo}`);
					marker.addTo(this.pointLayer);
				});
			});

			const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon]));
			if (bounds.isValid() && !this.hasUserAdjustedView) {
				this.withProgrammaticMove(() => {
					this.mapInstance.fitBounds(bounds.pad(0.1));
				});
			}

			this.mapStatus = `${points.length} points rendered.`;
		},

		loadHuts() {
			fetch("./data/hytter.csv")
				.then((response) => {
					if (!response.ok) {
						throw new Error("Could not fetch hut info");
					}
					return response.text();
				})
				.then((csvText) => {
					if (!window.Papa) {
						throw new Error("PapaParse not available");
					}
					const parsed = window.Papa.parse(csvText, {
						header: true,
						skipEmptyLines: true
					});
					this.hutData = Array.isArray(parsed.data) ? parsed.data : [];
					this.renderHuts(this.hutData);
				})
				.catch((error) => {
					console.warn(error.message);
				});
		},

		renderHuts(huts) {
			if (!this.mapInstance || !Array.isArray(huts)) {
				return;
			}

			if (this.hutLayer) {
				this.hutLayer.remove();
			}

			this.hutLayer = L.layerGroup();

			const icon = L.icon({
				iconUrl: "./assets/hut.png",
				iconSize: [20, 20],
				iconAnchor: [10, 10],
				popupAnchor: [0, -10]
			});

			huts.forEach((hut) => {
				const lat = Number(hut.latitude);
				const lon = Number(hut.longitude);
				if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
					return;
				}

				L.marker([lat, lon], { icon })
					.bindPopup(`
					<strong>${hut.name ?? "Unknown hut"}</strong><br />
					Owner: ${hut.ownername ?? "n/a"}<br />
					Height: ${hut.height ?? "-"} m<br />
					Type: ${hut.serviceLevel ?? "-"}${hut.dntKey && hut.dntKey !== "unlocked" ? ` (${hut.dntKey})` : ""}<br />
					Area: ${hut.areaName ?? "-"}<br />
					${lat.toFixed(5)}, ${lon.toFixed(5)}
				`)
					.addTo(this.hutLayer);
			});

			if (this.state.showHuts) {
				this.hutLayer.addTo(this.mapInstance);
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
