import * as Leaflet from "../node_modules/leaflet/dist/leaflet-src.esm.js";
import { makeColorScale } from "./colors.js";
import { normalizeMapSource, parseBooleanToken, readUrlState, writeUrlState } from "./url.js";
import { prepareTrackPoints } from "./trackpoints.js";

const L = Leaflet;
// Ensure backwards compatibility for any scripts expecting a global Leaflet instance.
if (typeof window !== "undefined" && !window.L) {
	window.L = L;
}

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
		url: "https://tile.tracetrack.com/topo__/{z}/{x}/{y}.png",
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
	speedCutoff: 120,
	baseColor: "#0077cc",
	colorParam: "",
	lat: DEFAULT_VIEW.lat,
	lng: DEFAULT_VIEW.lng,
	zoom: DEFAULT_VIEW.zoom
};

const urlStateOptions = {
	alias: { mapSource: "src", colorParam: "color" },
	numberKeys: ["breakHours", "speedCutoff", "lat", "lng", "zoom"],
	tokenParsers: {
		colorEnabled: (params, fallback) => {
			const token = params.get("color") ?? params.get("colour");
			return parseBooleanToken(token, fallback);
		},
		colorParam: (params) => params.get("color") ?? params.get("colour") ?? "",
		baseColor: (params, fallback) => params.get("baseColor") ?? params.get("baseColour") ?? fallback
	},
	persistedKeys: ["id", "mapSource", "breakHours", "speedCutoff", "baseColor", "lat", "lng", "zoom", "colorParam"]
};

const getInitialState = () => {
	const state = readUrlState(DEFAULT_STATE, urlStateOptions);
	return { ...DEFAULT_STATE, ...state, mapSource: normalizeMapSource(state.mapSource, MAP_SOURCES, DEFAULT_STATE.mapSource) };
};

const createAppState = () => ({
	mapSources: MAP_SOURCES,
	menuOpen: true,
	state: getInitialState(),
	pendingId: "",
	hasError: false,
	errorMessage: "",
	mapStatus: "",
	mapInstance: null,
	tileLayer: null,
	trackLayer: null,
	pointLayer: null,
	hutLayer: null,
	trackEvents: [],

	init() {
		this.menuOpen = true;
		this.pendingId = this.state.id;
		this.setupMap();
		if (this.state.id) {
			this.loadTrack();
		} else {
			this.mapStatus = "Enter an ID to load a track.";
		}
		this.loadHuts();
	},

	toggleMenu() {
		this.menuOpen = !this.menuOpen;
	},

	applyId() {
		const trimmed = (this.pendingId || "").trim();
		if (!trimmed) {
			this.errorMessage = "Please enter a valid track id.";
			this.hasError = true;
			return;
		}

		this.hasError = false;
		this.errorMessage = "";
		this.state.id = trimmed;
		writeUrlState(DEFAULT_STATE, { id: trimmed }, urlStateOptions);
		this.loadTrack();
	},

	setupMap() {
		if (!window.L) {
			this.errorMessage = "Leaflet failed to load.";
			this.hasError = true;
			return;
		}

		const mapOptions = {
			center: [this.state.lat, this.state.lng],
			zoom: this.state.zoom,
			zoomControl: true
		};

		this.mapInstance = L.map(this.$refs.map, mapOptions);
		this.updateTileLayer();

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
		writeUrlState(DEFAULT_STATE, { mapSource: source.key }, urlStateOptions);
	},

	updateMapSource() {
		this.state.mapSource = normalizeMapSource(this.state.mapSource, MAP_SOURCES, DEFAULT_STATE.mapSource);
		this.updateTileLayer();
		this.renderTrack();
	},

	toggleColoring() {
		const nextColor = this.state.colorEnabled ? "shenanigans" : "";
		this.state.colorParam = nextColor;
		writeUrlState(DEFAULT_STATE, { colorParam: nextColor }, urlStateOptions);
		this.renderTrack();
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
		writeUrlState(DEFAULT_STATE, { baseColor: this.state.baseColor }, urlStateOptions);
		this.renderTrack();
	},

	loadTrack() {
		if (!this.state.id) {
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
				this.renderTrack();
			})
			.catch((error) => {
				this.hasError = true;
				this.errorMessage = error.message || "Something went wrong.";
				this.mapStatus = this.errorMessage;
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

		groups.forEach((group) => {
			const groupColor = colorScale(group[0].groupId ?? 0);

			const visibleSegments = group.filter((point) => {
				if (!Number.isFinite(point.speed)) {
					return true;
				}
				return point.speed < speedLimit;
			});

			if (visibleSegments.length > 1) {
				const polyline = L.polyline(visibleSegments.map((point) => [point.lat, point.lon]), {
					color: groupColor,
					weight: 3,
					opacity: 0.7
				});
				polyline.addTo(this.trackLayer);
			}

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
				const speedInfo = Number.isFinite(point.speed) ? `${point.speed.toFixed(1)} km/h` : "n/a";
				marker.bindPopup(`Time: ${formattedTime}<br />Speed: ${speedInfo}`);
				marker.addTo(this.pointLayer);
			});
		});

		const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon]));
		if (bounds.isValid()) {
			this.mapInstance.fitBounds(bounds.pad(0.1));
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
				this.renderHuts(parsed.data ?? []);
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

		this.hutLayer.addTo(this.mapInstance);
	}
});

document.addEventListener("alpine:init", () => {
	if (!window.Alpine) {
		return;
	}
	window.Alpine.data("app", createAppState);
});

// Provide a global fallback so x-data="app()" keeps working even if Alpine
// evaluates before the alpine:init hook fires.
window.app = createAppState;
