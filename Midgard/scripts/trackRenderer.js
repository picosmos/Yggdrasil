import { makeColorScale } from "./colors.js";

// Haversine distance calculation in meters
const distanceBetween = (pointA, pointB) => {
	const toRad = (deg) => deg * (Math.PI / 180);
	const lat1 = toRad(pointA.lat);
	const lat2 = toRad(pointB.lat);
	const deltaLat = toRad(pointB.lat - pointA.lat);
	const deltaLon = toRad(pointB.lon - pointA.lon);
	const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return 6371000 * c; // Earth radius in meters
};

export const renderTrack = (mapManager, trackEvents, options) => {
	if (!mapManager.mapInstance) {
		return { pointsRendered: 0, message: "Map not initialized" };
	}

	mapManager.clearTrackLayers();

	if (!Array.isArray(trackEvents) || trackEvents.length === 0) {
		return { pointsRendered: 0, message: "No track events" };
	}

	const L = mapManager.getLeaflet();
	const colorScale = makeColorScale(options.colorEnabled, options.baseColor);
	const breakHoursMs = options.breakHours * 60 * 60 * 1000;
	const maxSegmentLengthMeters = Math.max(
		options.minSegmentLengthKm,
		Math.min(options.segmentLengthLimitKm ?? options.maxSegmentLengthKm, options.maxSegmentLengthKm)
	) * 1000;
	const speedLimit = options.speedCutoff;

	// Step 1: Extract and sort valid points from raw events
	const points = trackEvents
		.filter((event) => event?.event?.position && !event.event.position.invalid)
		.map((event) => {
			const pos = event.event.position;
			return {
				lat: Number(pos.lat),
				lon: Number(pos.lng),
				time: new Date(event.sent ?? event.event.time ?? event.time ?? event.timestamp ?? Date.now()),
				speed: Number(pos.speed ?? event.event.speed ?? event.speed ?? 0)
			};
		})
		.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
		.sort((a, b) => a.time - b.time);

	if (points.length === 0) {
		return { pointsRendered: 0, message: "No usable points" };
	}

	// Step 2: Assign groupIds and calculate speeds in a single pass
	points[0].groupId = 0;
	points[0].speed = 0;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const timeDeltaMs = curr.time - prev.time;

		// Assign group based on time break
		curr.groupId = timeDeltaMs > breakHoursMs ? prev.groupId + 1 : prev.groupId;

		// Calculate or normalize speed
		if (!Number.isFinite(curr.speed) || curr.speed <= 0) {
			const seconds = timeDeltaMs / 1000;
			if (seconds > 0) {
				const distance = distanceBetween(prev, curr);
				curr.speed = (distance / seconds) * 3.6; // m/s to km/h
			} else {
				curr.speed = 0;
			}
		} else {
			curr.speed = curr.speed * (curr.speed > 20 ? 1 : 3.6); // Normalize to km/h
		}
	}

	// Step 3: Group points into sub-series
	const subSeries = [];
	let currentSeries = [points[0]];
	for (let i = 1; i < points.length; i++) {
		if (points[i].groupId !== points[i - 1].groupId) {
			subSeries.push(currentSeries);
			currentSeries = [points[i]];
		} else {
			currentSeries.push(points[i]);
		}
	}
	subSeries.push(currentSeries);

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

	// Helper: Create pairs of consecutive elements like F# Seq.pairwise
	const pairwise = (arr) => arr.slice(0, -1).map((item, i) => [item, arr[i + 1]]);

	// Step 4: Render each sub-series
	subSeries.forEach((series) => {
		const seriesColor = colorScale(series[0].groupId);

		// Step 4a: Calculate track segments with speed calculated per segment
		const segments = pairwise(series).map(([curr, next]) => {
			const timeDelta = next.time - curr.time;
			const distance = distanceBetween(curr, next);
			
			// Calculate speed for THIS SEGMENT (not from point data)
			const timeSeconds = timeDelta / 1000;
			const segmentSpeed = timeSeconds > 0 ? (distance / timeSeconds) * 3.6 : 0; // km/h
			
			// Determine if this segment qualifies as a valid track segment
			const isTrackSegment = segmentSpeed < speedLimit && distance <= maxSegmentLengthMeters;
			
			return { curr, next, distance, segmentSpeed, isTrackSegment };
		});

		// Build set of point indices that are adjacent to valid track segments
		const connectedPoints = new Set();
		segments.forEach(({ isTrackSegment }, index) => {
			if (isTrackSegment) {
				connectedPoints.add(index);
				connectedPoints.add(index + 1);
			}
		});

		// Step 4b: Draw each point
		series.forEach((point, index) => {
			const isConnected = connectedPoints.has(index);
			const radius = isConnected ? 5 : 2.5;
			const opacity = isConnected ? 0.85 : 0.5;

			const marker = L.circleMarker([point.lat, point.lon], {
				radius,
				color: seriesColor,
				fillColor: seriesColor,
				fillOpacity: opacity,
				weight: 1
			});

			const time = timeFormatter.format(point.time).replace(",", "");
			const speed = Number.isFinite(point.speed) ? `${point.speed.toFixed(1)}km/h` : "n/a";
			const status = isConnected ? "Connected" : "Isolated";
			marker.bindPopup(`Time: ${time}`);
			marker.addTo(mapManager.pointLayer);
		});

		// Step 4c: Draw all track segments
		segments.forEach(({ curr, next, distance, segmentSpeed, isTrackSegment }) => {
			// Skip segments that exceed the length limit entirely
			if (distance > maxSegmentLengthMeters) {
				return;
			}

			const coords = [[curr.lat, curr.lon], [next.lat, next.lon]];

			if (isTrackSegment) {
				L.polyline(coords, {
					color: seriesColor,
					weight: 3,
					opacity: 0.7
				}).addTo(mapManager.trackLayer);
			} else {
				L.polyline(coords, {
					color: seriesColor,
					weight: 2,
					opacity: 0.6,
					dashArray: '4, 4'
				}).addTo(mapManager.trackLayer);
			}
		});
	});

	// Step 5: Fit map bounds if needed
	const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
	if (bounds.isValid() && !options.hasUserAdjustedView) {
		mapManager.fitBounds(bounds);
	}

	return { pointsRendered: points.length, message: `${points.length} points rendered` };
};
