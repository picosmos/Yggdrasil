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

		L.marker([lat, lon], { icon })
			.bindPopup(`
				<strong>${hut.name ?? "Unknown hut"}</strong><br />
				Owner: ${hut.ownername ?? "n/a"}<br />
				Height: ${hut.height ?? "-"} m<br />
				Type: ${hut.serviceLevel ?? "-"}${hut.dntKey && hut.dntKey !== "unlocked" ? ` (${hut.dntKey})` : ""}<br />
				Area: ${hut.areaName ?? "-"}<br />
				${lat.toFixed(5)}, ${lon.toFixed(5)}
			`)
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
