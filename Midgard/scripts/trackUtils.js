/**
 * Utility functions for handling track ID objects and arrays
 */

/**
 * Extracts the ID from a track item (either string or object)
 * @param {string|{id: string, enabled?: boolean}} item - Track item
 * @returns {string} The track ID
 */
export const getTrackId = (item) => {
	return typeof item === 'string' ? item : item.id;
};

/**
 * Extracts the enabled status from a track item
 * @param {string|{id: string, enabled?: boolean}} item - Track item
 * @returns {boolean} Whether the track is enabled (defaults to true for string items)
 */
export const getTrackEnabled = (item) => {
	return typeof item === 'string' ? true : item.enabled;
};

/**
 * Normalizes a track item to ensure it's an object with id and enabled properties
 * @param {string|{id: string, enabled?: boolean}} item - Track item
 * @returns {{id: string, enabled: boolean}} Normalized track object
 */
export const normalizeTrackItem = (item) => {
	if (typeof item === 'string') {
		return { id: item, enabled: true };
	}
	return { id: item.id, enabled: item.enabled ?? true };
};

/**
 * Creates a track item object from ID and enabled status
 * @param {string} id - Track ID
 * @param {boolean} enabled - Whether the track is enabled
 * @returns {{id: string, enabled: boolean}} Track item object
 */
export const createTrackItem = (id, enabled = true) => {
	return { id, enabled };
};