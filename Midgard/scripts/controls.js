/**
 * Slider and control utility functions
 */

export const findNearestIndex = (options, value) => {
	const matchIndex = options.findIndex((item) => item === value);
	if (matchIndex !== -1) {
		return matchIndex;
	}

	let nearestIndex = 0;
	let smallestDiff = Number.POSITIVE_INFINITY;
	options.forEach((item, index) => {
		const diff = Math.abs(item - value);
		if (diff < smallestDiff) {
			smallestDiff = diff;
			nearestIndex = index;
		}
	});
	return nearestIndex;
};

export const createSliderHandler = (options) => {
	return {
		getIndex(currentValue) {
			return findNearestIndex(options, currentValue);
		},

		setValue(rawIndex) {
			const index = Math.round(Number(rawIndex));
			const clampedIndex = Math.min(Math.max(index, 0), options.length - 1);
			return options[clampedIndex];
		}
	};
};

export const createSegmentLengthHandler = (minKm, maxKm, sliderSteps) => {
	return {
		getSliderValue(currentKm) {
			const value = Math.max(minKm, Math.min(currentKm ?? maxKm, maxKm));
			const ratio = Math.log(value / minKm) / Math.log(maxKm / minKm);
			if (!Number.isFinite(ratio)) {
				return sliderSteps;
			}
			return Math.round(ratio * sliderSteps);
		},

		getKmValue(sliderPosition) {
			const position = Math.max(0, Math.min(Number(sliderPosition), sliderSteps));
			const ratio = position / sliderSteps;
			const rawKm = minKm * ((maxKm / minKm) ** ratio);
			const roundedKm = Math.round(rawKm * 10) / 10;
			return Math.max(minKm, Math.min(roundedKm, maxKm));
		}
	};
};