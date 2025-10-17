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

export const readQueryParams = (key) => {
	const params = new URLSearchParams(window.location.search);
	return params.getAll(key);
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

	// Handle multiple IDs specially - parse enabled/disabled state from ! prefix
	const rawIds = params.getAll('id');
	if (rawIds.length > 0) {
		// Parse and de-duplicate IDs (keep last occurrence)
		const idMap = new Map();
		rawIds.forEach(id => {
			const disabled = id.startsWith('!');
			const cleanId = disabled ? id.substring(1) : id;
			idMap.set(cleanId, { id: cleanId, enabled: !disabled });
		});
		state.ids = Array.from(idMap.values());
	} else if (!state.ids) {
		// Ensure ids is always an array
		state.ids = [];
	}	Object.entries(defaults).forEach(([key, fallback]) => {
		// Skip 'id' as it's handled above, and skip 'ids' from defaults
		if (key === 'id' || key === 'ids') {
			return;
		}

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
		// Handle multiple IDs specially with ! prefix for disabled tracks
		if (key === 'ids') {
			// Only update ids if they're explicitly in the partial update
			if (partial.ids !== undefined) {
				// Clear all 'id' params first before re-adding
				url.searchParams.delete('id');
				
				if (Array.isArray(next.ids) && next.ids.length > 0) {
					// Remove duplicates by id
					const seen = new Set();
					next.ids.forEach(item => {
						const id = typeof item === 'string' ? item : item.id;
						const enabled = typeof item === 'string' ? true : item.enabled;
						
						if (id && id.trim() && !seen.has(id)) {
							seen.add(id);
							const urlId = enabled ? id : `!${id}`;
							url.searchParams.append('id', urlId);
						}
					});
				}
			}
			return;
		}

		// Skip 'id' as it's handled via 'ids'
		if (key === 'id') {
			return;
		}

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

export const readPerTrackParams = (trackIds, defaultColor, defaultBreakHours, defaultColorEnabled, perTrackAlias = {}) => {
	const params = new URLSearchParams(window.location.search);
	const trackSettings = {};

	// Get aliases or use full property names as defaults
	const colorAlias = perTrackAlias.color || 'color';
	const breakHoursAlias = perTrackAlias.breakHours || 'breakHours';
	const colorEnabledAlias = perTrackAlias.colorEnabled || 'colorEnabled';

	trackIds.forEach(item => {
		const id = typeof item === 'string' ? item : item.id;
		const enabled = typeof item === 'string' ? true : item.enabled;
		
		trackSettings[id] = {
			enabled,
			color: params.get(`${colorAlias}-${id}`) || defaultColor,
			breakHours: parseNumberValue(params.get(`${breakHoursAlias}-${id}`), defaultBreakHours),
			colorEnabled: parseBooleanToken(params.get(`${colorEnabledAlias}-${id}`), defaultColorEnabled)
		};
	});

	return trackSettings;
};

export const writePerTrackParams = (trackSettings, perTrackAlias = {}) => {
	const url = new URL(window.location.href);
	
	// Get aliases or use full property names as defaults
	const colorAlias = perTrackAlias.color || 'color';
	const breakHoursAlias = perTrackAlias.breakHours || 'breakHours';
	const colorEnabledAlias = perTrackAlias.colorEnabled || 'colorEnabled';
	
	// Clear all per-track params first
	const keys = Array.from(url.searchParams.keys());
	keys.forEach(key => {
		if (key.startsWith(`${colorAlias}-`) || 
		    key.startsWith(`${breakHoursAlias}-`) || 
		    key.startsWith(`${colorEnabledAlias}-`)) {
			url.searchParams.delete(key);
		}
	});

	// Write new per-track params (enabled state is in the ! prefix of id)
	Object.entries(trackSettings).forEach(([id, settings]) => {
		url.searchParams.set(`${colorAlias}-${id}`, settings.color);
		url.searchParams.set(`${breakHoursAlias}-${id}`, settings.breakHours);
		url.searchParams.set(`${colorEnabledAlias}-${id}`, settings.colorEnabled ? 'true' : 'false');
	});

	window.history.replaceState({}, "", url.toString());
};
