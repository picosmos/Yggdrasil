const truthyTokens = new Set(["true", "1", "yes", "on", "shenanigans"]);

export const parseNumberValue = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseBooleanToken = (value, fallback) => {
	if (value === null || value === undefined) {
		return fallback;
	}

	return truthyTokens.has(String(value).toLowerCase());
};

export const readQueryParam = (key) => {
	const params = new URLSearchParams(window.location.search);
	return params.get(key);
};

export const readUrlState = (defaults, options = {}) => {
	const {
		alias = {},
		numberKeys = [],
		booleanKeys = [],
		tokenParsers = {}
	} = options;

	const params = new URLSearchParams(window.location.search);
	const state = { ...defaults };

	Object.entries(defaults).forEach(([key, fallback]) => {
		const paramKey = alias[key] ?? key;
		if (!params.has(paramKey)) {
			state[key] = fallback;
			return;
		}

		const rawValue = params.get(paramKey);
		if (numberKeys.includes(key)) {
			state[key] = parseNumberValue(rawValue, fallback);
			return;
		}

		if (booleanKeys.includes(key)) {
			state[key] = parseBooleanToken(rawValue, fallback);
			return;
		}

		state[key] = rawValue ?? fallback;
	});

	Object.entries(tokenParsers).forEach(([key, parser]) => {
		state[key] = parser(params, state[key]);
	});

	return state;
};

export const writeUrlState = (defaults, partial, options = {}) => {
	const {
		alias = {},
		persistedKeys,
		numberKeys = [],
		booleanKeys = [],
		tokenParsers = {}
	} = options;

	const url = new URL(window.location.href);
	const current = readUrlState(defaults, { alias, numberKeys, booleanKeys, tokenParsers });
	const next = { ...current, ...partial };
	const keysToPersist = persistedKeys ?? Object.keys(next);

	keysToPersist.forEach((key) => {
		const paramKey = alias[key] ?? key;
		const value = next[key];

		if (value === undefined || value === null || value === "") {
			url.searchParams.delete(paramKey);
			return;
		}

		url.searchParams.set(paramKey, value);
	});

	window.history.replaceState({}, "", url.toString());
};

export const normalizeMapSource = (sourceKey, mapSources, fallbackKey) => {
	const match = mapSources.find((candidate) => candidate.key === sourceKey);
	return match ? match.key : fallbackKey;
};
