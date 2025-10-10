const toRadians = (value) => value * (Math.PI / 180);

export const distanceBetweenPoints = (pointA, pointB, earthRadiusMeters = 6371000) => {
	const latOne = toRadians(pointA.lat);
	const latTwo = toRadians(pointB.lat);
	const deltaLat = toRadians(pointB.lat - pointA.lat);
	const deltaLon = toRadians(pointB.lon - pointA.lon);

	const halfChord = Math.sin(deltaLat / 2) ** 2 + Math.cos(latOne) * Math.cos(latTwo) * Math.sin(deltaLon / 2) ** 2;
	const centralAngle = 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));

	return earthRadiusMeters * centralAngle;
};
