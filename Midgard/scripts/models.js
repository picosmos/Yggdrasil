/**
 * Data models and classes
 */

/**
 * Represents a GPS track with its associated data and settings
 */
export class Track {
	constructor(id, options = {}) {
		this.id = id;
		this.enabled = options.enabled ?? true;
		this.color = options.color ?? "#0077cc";
		this.breakHours = options.breakHours ?? 3.0;
		this.colorEnabled = options.colorEnabled ?? false;
		this.data = options.data ?? [];
	}

	/**
	 * Creates a Track instance from a track ID item (string or object)
	 * @param {string|{id: string, enabled?: boolean}} item - Track item
	 * @param {object} settings - Additional track settings
	 * @returns {Track} New Track instance
	 */
	static fromIdItem(item, settings = {}) {
		const id = typeof item === 'string' ? item : item.id;
		const enabled = typeof item === 'string' ? true : (item.enabled ?? true);
		
		return new Track(id, {
			enabled,
			...settings
		});
	}

	/**
	 * Converts track to ID item format for URL persistence
	 * @returns {{id: string, enabled: boolean}} ID item object
	 */
	toIdItem() {
		return {
			id: this.id,
			enabled: this.enabled
		};
	}

	/**
	 * Gets track settings object for URL persistence
	 * @returns {object} Settings object
	 */
	getSettings() {
		return {
			enabled: this.enabled,
			color: this.color,
			breakHours: this.breakHours,
			colorEnabled: this.colorEnabled
		};
	}

	/**
	 * Updates track settings
	 * @param {object} settings - Settings to update
	 */
	updateSettings(settings) {
		Object.assign(this, settings);
	}

	/**
	 * Checks if track has data loaded
	 * @returns {boolean} True if track has data
	 */
	hasData() {
		return Array.isArray(this.data) && this.data.length > 0;
	}

	/**
	 * Sets track data
	 * @param {Array} data - Track event data
	 */
	setData(data) {
		this.data = Array.isArray(data) ? data : [];
	}

	/**
	 * Gets track data
	 * @returns {Array} Track event data
	 */
	getData() {
		return this.data;
	}

	/**
	 * Toggles track enabled state
	 */
	toggle() {
		this.enabled = !this.enabled;
	}
}

/**
 * Utility functions for working with track ID items
 */
export class TrackUtils {
	/**
	 * Extracts the ID from a track item (either string or object)
	 * @param {string|{id: string, enabled?: boolean}} item - Track item
	 * @returns {string} The track ID
	 */
	static getTrackId(item) {
		return typeof item === 'string' ? item : item.id;
	}

	/**
	 * Extracts the enabled status from a track item
	 * @param {string|{id: string, enabled?: boolean}} item - Track item
	 * @returns {boolean} Whether the track is enabled (defaults to true for string items)
	 */
	static getTrackEnabled(item) {
		return typeof item === 'string' ? true : item.enabled;
	}

	/**
	 * Normalizes a track item to ensure it's an object with id and enabled properties
	 * @param {string|{id: string, enabled?: boolean}} item - Track item
	 * @returns {{id: string, enabled: boolean}} Normalized track object
	 */
	static normalizeTrackItem(item) {
		if (typeof item === 'string') {
			return { id: item, enabled: true };
		}
		return { id: item.id, enabled: item.enabled ?? true };
	}

	/**
	 * Creates a track item object from ID and enabled status
	 * @param {string} id - Track ID
	 * @param {boolean} enabled - Whether the track is enabled
	 * @returns {{id: string, enabled: boolean}} Track item object
	 */
	static createTrackItem(id, enabled = true) {
		return { id, enabled };
	}
}