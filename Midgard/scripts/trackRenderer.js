import { prepareTrackPoints } from "./trackpoints.js";
import { distanceBetweenPoints } from "./coordinates.js";
import { makeColorScale } from "./colors.js";

export const renderTrack = (mapManager, trackEvents, options) => {
	if (!mapManager.mapInstance) {
		return { pointsRendered: 0, message: "Map not initialized" };
	}

	mapManager.clearTrackLayers();

	if (!Array.isArray(trackEvents) || trackEvents.length === 0) {
		return { pointsRendered: 0, message: "No track events" };
	}

	const points = prepareTrackPoints(trackEvents, { breakHours: options.breakHours });
	if (points.length === 0) {
		return { pointsRendered: 0, message: "No usable points" };
	}

	const colorScale = makeColorScale(options.colorEnabled, options.baseColor);
	const groups = Object.values(points.reduce((acc, point) => {
		const key = point.groupId ?? 0;
		if (!acc[key]) {
			acc[key] = [];
		}
		acc[key].push(point);
		return acc;
	}, {}));

	const speedLimit = options.speedCutoff;
	const segmentLimitKm = Math.max(
		options.minSegmentLengthKm,
		Math.min(options.segmentLengthLimitKm ?? options.maxSegmentLengthKm, options.maxSegmentLengthKm)
	);
	const maxSegmentLengthMeters = segmentLimitKm * 1000;

	const L = mapManager.getLeaflet();

	groups.forEach((group) => {
		const groupColor = colorScale(group[0].groupId ?? 0);
		const segments = buildSegments(group, speedLimit, maxSegmentLengthMeters);

		segments.forEach((segment) => {
			if (segment.length < 2) {
				return;
			}
			const polyline = L.polyline(segment.map((point) => [point.lat, point.lon]), {
				color: groupColor,
				weight: 3,
				opacity: 0.7
			});
			polyline.addTo(mapManager.trackLayer);
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
			marker.addTo(mapManager.pointLayer);
		});
	});

	const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon]));
	if (bounds.isValid() && !options.hasUserAdjustedView) {
		mapManager.fitBounds(bounds);
	}

	return { pointsRendered: points.length, message: `${points.length} points rendered` };
};

const buildSegments = (group, speedLimit, maxSegmentLengthMeters) => {
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

	return segments;
};
