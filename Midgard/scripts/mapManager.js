import * as Leaflet from "../node_modules/leaflet/dist/leaflet-src.esm.js";

const L = Leaflet;

export class MapManager {
	constructor() {
		this.mapInstance = null;
		this.tileLayer = null;
		this.trackLayer = null;
		this.pointLayer = null;
		this.hutLayer = null;
		this.isProgrammaticMove = false;
		this.onViewChange = null;
	}

	initialize(container, initialView, mapSources, mapSourceKey) {
		if (this.mapInstance) {
			return;
		}

		if (!container) {
			throw new Error("Map container is required");
		}

		if (container._leaflet_id) {
			container._leaflet_id = null;
		}

		const mapOptions = {
			center: [initialView.lat, initialView.lng],
			zoom: initialView.zoom,
			zoomControl: true
		};

		this.mapInstance = L.map(container, mapOptions);
		this.updateTileLayer(mapSources, mapSourceKey);

		this.trackLayer = L.layerGroup().addTo(this.mapInstance);
		this.pointLayer = L.layerGroup().addTo(this.mapInstance);

		// cspell:ignore: moveend
		this.mapInstance.on("moveend", () => {
			if (this.onViewChange) {
				const center = this.mapInstance.getCenter();
				const zoom = this.mapInstance.getZoom();
				this.onViewChange({
					lat: Number(center.lat.toFixed(5)),
					lng: Number(center.lng.toFixed(5)),
					zoom,
					isProgrammatic: this.isProgrammaticMove
				});
			}
		});

		L.control.scale().addTo(this.mapInstance);
	}

	updateTileLayer(mapSources, mapSourceKey) {
		const source = mapSources.find((item) => item.key === mapSourceKey) ?? mapSources[0];

		if (this.tileLayer) {
			this.tileLayer.remove();
		}

		this.tileLayer = L.tileLayer(source.url, source.options);
		this.tileLayer.addTo(this.mapInstance);
	}

	setView(lat, lng, zoom) {
		if (!this.mapInstance) {
			return;
		}

		this.withProgrammaticMove(() => {
			this.mapInstance.setView([lat, lng], zoom);
		});
	}

	fitBounds(bounds, padding = 0.1) {
		if (!this.mapInstance || !bounds.isValid()) {
			return;
		}

		this.withProgrammaticMove(() => {
			this.mapInstance.fitBounds(bounds.pad(padding));
		});
	}

	invalidateSize() {
		if (this.mapInstance) {
			this.mapInstance.invalidateSize();
		}
	}

	withProgrammaticMove(action) {
		this.isProgrammaticMove = true;
		try {
			action();
		} finally {
			setTimeout(() => {
				this.isProgrammaticMove = false;
			}, 0);
		}
	}

	clearTrackLayers() {
		if (this.trackLayer) {
			this.trackLayer.clearLayers();
		}
		if (this.pointLayer) {
			this.pointLayer.clearLayers();
		}
	}

	clearHutLayer() {
		if (this.hutLayer) {
			this.hutLayer.remove();
			this.hutLayer = null;
		}
	}

	createHutLayer() {
		this.clearHutLayer();
		this.hutLayer = L.layerGroup();
	}

	showHutLayer() {
		if (this.hutLayer && this.mapInstance) {
			this.hutLayer.addTo(this.mapInstance);
		}
	}

	hideHutLayer() {
		if (this.hutLayer) {
			this.hutLayer.remove();
		}
	}

	getLeaflet() {
		return L;
	}
}
