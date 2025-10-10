import { distanceBetweenPoints } from "./coordinates.js";

export const hoursToMilliseconds = 60 * 60 * 1000;

const toTrackPoint = (event) => {
	const position = event?.event?.position;
	return {
		lat: Number(position?.lat),
		lon: Number(position?.lng),
		alt: Number(position?.alt ?? 0),
		time: new Date(event?.sent ?? event?.event?.time ?? event?.time ?? event?.timestamp ?? Date.now()),
		speed: Number(position?.speed ?? event?.event?.speed ?? event?.speed ?? 0),
		raw: event
	};
};

export const prepareTrackPoints = (events = [], options) => {
	const { breakHours = 4 } = options ?? {};
	const breakWindow = breakHours * hoursToMilliseconds;

	const points = events
		.filter((entry) => entry?.event?.position && !entry.event.position.invalid)
		.map(toTrackPoint)
		.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
		.sort((left, right) => left.time - right.time);

	if (points.length === 0) {
		return [];
	}

	points[0].groupId = 0;

	for (let index = 1; index < points.length; index += 1) {
		const previous = points[index - 1];
		const current = points[index];
		current.groupId = previous.groupId;
		const timeDelta = current.time - previous.time;

		if (timeDelta > breakWindow) {
			current.groupId += 1;
		}

		if (!Number.isFinite(current.speed) || current.speed <= 0) {
			const seconds = timeDelta / 1000;
			if (seconds > 0) {
				const distance = distanceBetweenPoints(previous, current);
				current.speed = (distance / seconds) * 3.6;
			}
		} else {
			current.speed = current.speed * (current.speed > 20 ? 1 : 3.6);
		}
	}

	if (!Number.isFinite(points[0].speed)) {
		points[0].speed = 0;
	}

	return points;
};
