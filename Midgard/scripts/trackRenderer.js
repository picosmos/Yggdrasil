import { makeColorScale, blendColors } from "./colors.js";

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
                speed: Number(pos.speed ?? event.event.speed ?? event.speed ?? 0),
                altitude: pos.altitude ?? pos.alt ?? null
            };
        })
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
        .sort((a, b) => a.time - b.time);

    if (points.length === 0) {
        return { pointsRendered: 0, message: "No usable points" };
    }

    // Step 2: Assign groupIds and calculate speeds in a single pass
    if (options.colorEnabled) {
        points[0].groupId = 0;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const timeDeltaMs = curr.time - prev.time;

            // Assign group based on time break
            curr.groupId = timeDeltaMs > breakHoursMs ? prev.groupId + 1 : prev.groupId;
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
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Oslo",
        hour12: false
    });

    // Helper: Create pairs of consecutive elements like F# Seq.pairwise
    const pairwise = (arr) => arr.slice(0, -1).map((item, i) => [item, arr[i + 1]]);

    // Helper: Format duration in a human-readable way
    const formatDuration = (ms) => {
        if (ms < 0) return "N/A";
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    // Helper: Format distance in a human-readable way
    const formatDistance = (meters) => {
        if (meters < 0) return "N/A";
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(2)}km`;
    };

    // Helper: Create GeoHack URL for coordinates
    const createGeoHackUrl = (lat, lon) => {
        const latAbs = Math.abs(lat);
        const lonAbs = Math.abs(lon);
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `https://geohack.toolforge.org/geohack.php?params=${latAbs}_${latDir}_${lonAbs}_${lonDir}`;
    };

    // Helper: Create popup HTML content
    const createPopupContent = (point, prevPoint, nextPoint) => {
        // Format time as "dd MMM yyyy, hh:mm:ss"
        const formattedParts = timeFormatter.formatToParts(point.time);
        const day = formattedParts.find(p => p.type === 'day').value;
        const month = formattedParts.find(p => p.type === 'month').value;
        const year = formattedParts.find(p => p.type === 'year').value;
        const hour = formattedParts.find(p => p.type === 'hour').value;
        const minute = formattedParts.find(p => p.type === 'minute').value;
        const second = formattedParts.find(p => p.type === 'second').value;
        const time = `${day} ${month} ${year}, ${hour}:${minute}:${second}`;
        
        const geoHackUrl = createGeoHackUrl(point.lat, point.lon);
        
        let html = '<table class="track-point-info">';
        
        // Time with timezone
        html += `<tr><th>Time:</th><td>${time}</td></tr>`;
        
        // Altitude
        const altitudeText = point.altitude !== null && point.altitude !== undefined 
            ? `${Math.round(point.altitude)} m` 
            : 'N/A';
        html += `<tr><th>Altitude:</th><td>${altitudeText}</td></tr>`;
        
        // Coordinates with GeoHack link
        const latDir = point.lat >= 0 ? 'N' : 'S';
        const lonDir = point.lon >= 0 ? 'E' : 'W';
        const coordsText = `${Math.abs(point.lat).toFixed(6)}° ${latDir}, ${Math.abs(point.lon).toFixed(6)}° ${lonDir}`;
        html += `<tr><th>Coordinates:</th><td><a href="${geoHackUrl}" target="_blank" rel="noopener noreferrer">${coordsText}</a></td></tr>`;
        
        // Distance to previous point
        if (prevPoint) {
            const distToPrev = distanceBetween(prevPoint, point);
            html += `<tr><th>Distance from prev:</th><td>${formatDistance(distToPrev)}</td></tr>`;
        }
        
        // Distance to next point
        if (nextPoint) {
            const distToNext = distanceBetween(point, nextPoint);
            html += `<tr><th>Distance to next:</th><td>${formatDistance(distToNext)}</td></tr>`;
        }
        
        // Time elapsed from previous point
        if (prevPoint) {
            const timeDelta = point.time - prevPoint.time;
            html += `<tr><th>Time from prev:</th><td>${formatDuration(timeDelta)}</td></tr>`;
        }
        
        // Time elapsed to next point
        if (nextPoint) {
            const timeDelta = nextPoint.time - point.time;
            html += `<tr><th>Time to next:</th><td>${formatDuration(timeDelta)}</td></tr>`;
        }
        
        html += '</table>';
        return html;
    };

    // Step 4: Render segments between sub-series
    for (let i = 0; i < subSeries.length - 1; i++) {
        const currentSeries = subSeries[i];
        const nextSeries = subSeries[i + 1];

        // Get last point of current series and first point of next series
        const lastPoint = currentSeries[currentSeries.length - 1];
        const firstPoint = nextSeries[0];

        // Calculate distance between the two points
        const distance = distanceBetween(lastPoint, firstPoint);

        // Only render if distance is within the limit
        if (distance <= maxSegmentLengthMeters) {
            const color1 = colorScale(lastPoint.groupId);
            const color2 = colorScale(firstPoint.groupId);
            const blendedColor = blendColors(color1, color2);

            const coords = [[lastPoint.lat, lastPoint.lon], [firstPoint.lat, firstPoint.lon]];

            L.polyline(coords, {
                color: blendedColor,
                weight: 3,
                opacity: 1.0,
                dashArray: '3, 4.5'
            }).addTo(mapManager.trackLayer);
        }
    }

    // Step 5: Render each sub-series
    subSeries.forEach((series) => {
        const seriesColor = colorScale(series[0].groupId);

        // Step 5a: Calculate track segments with speed calculated per segment
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

        // Step 5b: Draw all track segments
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
                    opacity: 1.0
                }).addTo(mapManager.trackLayer);
            } else {
                L.polyline(coords, {
                    color: seriesColor,
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '3, 4.5'
                }).addTo(mapManager.trackLayer);
            }
        });
        
        // Step 5c: Draw each point
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

            const prevPoint = index > 0 ? series[index - 1] : null;
            const nextPoint = index < series.length - 1 ? series[index + 1] : null;
            const popupContent = createPopupContent(point, prevPoint, nextPoint);
            marker.bindPopup(popupContent);
            marker.addTo(mapManager.pointLayer);
        });
    });

    // Step 6: Fit map bounds if needed
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    if (bounds.isValid() && !options.hasUserAdjustedView) {
        mapManager.fitBounds(bounds);
    }

    return { pointsRendered: points.length, message: `${points.length} points rendered` };
};
