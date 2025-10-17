import { createGeoHackUrl } from "./geoUtils.js";

export const renderHuts = (mapManager, hutData, iconUrl) => {
	if (!mapManager.mapInstance || !Array.isArray(hutData)) {
		return;
	}

	mapManager.createHutLayer();

	const L = mapManager.getLeaflet();
	const icon = L.icon({
		iconUrl,
		iconSize: [20, 20],
		iconAnchor: [10, 10],
		popupAnchor: [0, -10]
	});

	hutData.forEach((hut) => {
		const lat = Number(hut.latitude);
		const lon = Number(hut.longitude);
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
			return;
		}

		const geoHackUrl = createGeoHackUrl(lat, lon);
		const latDir = lat >= 0 ? 'N' : 'S';
		const lonDir = lon >= 0 ? 'E' : 'W';
		const coordsText = `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;

		let popupHtml = '<table class="track-point-info">';
		popupHtml += `<tr><th>Name:</th><td><strong>${hut.name ?? "Unknown hut"}</strong></td></tr>`;
		popupHtml += `<tr><th>Owner:</th><td>${hut.ownername ?? "n/a"}</td></tr>`;
		popupHtml += `<tr><th>Height:</th><td>${hut.height ?? "-"} m</td></tr>`;
		popupHtml += `<tr><th>Type:</th><td>${hut.serviceLevel ?? "-"}${hut.dntKey && hut.dntKey !== "unlocked" ? ` (${hut.dntKey})` : ""}</td></tr>`;
		popupHtml += `<tr><th>Area:</th><td>${hut.areaName ?? "-"}</td></tr>`;
		popupHtml += `<tr><th>Coordinates:</th><td><a href="${geoHackUrl}" target="_blank" rel="noopener noreferrer">${coordsText}</a></td></tr>`;
		popupHtml += '</table>';

		L.marker([lat, lon], { icon })
			.bindPopup(popupHtml)
			.addTo(mapManager.hutLayer);
	});
};

export const loadHuts = async (csvUrl) => {
	const response = await fetch(csvUrl);
	if (!response.ok) {
		throw new Error("Could not fetch hut info");
	}

	const csvText = await response.text();
	if (!window.Papa) {
		throw new Error("PapaParse not available");
	}

	const parsed = window.Papa.parse(csvText, {
		header: true,
		skipEmptyLines: true
	});

	return Array.isArray(parsed.data) ? parsed.data : [];
};
