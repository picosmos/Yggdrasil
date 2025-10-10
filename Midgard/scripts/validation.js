const DEFAULT_BASE_COLOR = "#0077cc";
const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

export const sanitizeHexColor = (value, fallback = DEFAULT_BASE_COLOR) => {
	if (typeof value !== "string") {
		return fallback;
	}

	let next = value.trim();
	if (!next) {
		return fallback;
	}

	if (!next.startsWith("#")) {
		next = `#${next}`;
	}

	if (!HEX_COLOR_PATTERN.test(next)) {
		return fallback;
	}

	return next.toLowerCase();
};

export { DEFAULT_BASE_COLOR };
