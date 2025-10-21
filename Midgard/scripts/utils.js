import { Hsluv } from "../node_modules/hsluv/dist/hsluv.mjs";

// ===== Color Utils =====
const DEFAULT_BASE_COLOR = "#0077cc";
const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

const defaultSaturation = 100;
const defaultLightness = 37;
const defaultHueShift = 77;

let sharedConverter;

const getConverter = () => {
	sharedConverter = sharedConverter ?? new Hsluv();
	return sharedConverter;
};

export class ColorUtils {
	static sanitizeHexColor(value, fallback = DEFAULT_BASE_COLOR) {
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
	}

	static convertHueToHex(hue, baseColor, saturation = defaultSaturation, lightness = defaultLightness) {
		const rotation = ((hue % 360) + 360) % 360;
		try {
			const converter = getConverter();
			converter.hsluv_h = rotation;
			converter.hsluv_s = saturation;
			converter.hsluv_l = lightness;
			converter.hsluvToHex();
			return converter.hex ?? baseColor;
		} catch (error) {
			console.warn("Failed to convert HSLuv hue to hex; falling back to base color", error);
			return baseColor;
		}
	}

	static blendColors(hexColor1, hexColor2) {
		try {
			const converter = getConverter();
			
			// Convert first color to HSLuv
			converter.hex = hexColor1;
			converter.hexToHsluv();
			const h1 = converter.hsluv_h;
			const s1 = converter.hsluv_s;
			const l1 = converter.hsluv_l;
			
			// Convert second color to HSLuv
			converter.hex = hexColor2;
			converter.hexToHsluv();
			const h2 = converter.hsluv_h;
			const s2 = converter.hsluv_s;
			const l2 = converter.hsluv_l;
			
			// Average the HSLuv components
			// Handle hue wrapping for proper circular averaging
			let avgHue;
			const hueDiff = Math.abs(h2 - h1);
			if (hueDiff > 180) {
				// Wrap around 360 degrees
				avgHue = ((h1 + h2 + 360) / 2) % 360;
			} else {
				avgHue = (h1 + h2) / 2;
			}
			
			const avgSat = (s1 + s2) / 2;
			const avgLight = (l1 + l2) / 2;
			
			// Convert back to hex
			converter.hsluv_h = avgHue;
			converter.hsluv_s = avgSat;
			converter.hsluv_l = avgLight;
			converter.hsluvToHex();
			
			return converter.hex ?? hexColor1;
		} catch (error) {
			console.warn("Failed to blend colors; falling back to first color", error);
			return hexColor1;
		}
	}

	static makeColorScale(colorEnabled, baseColor, { hueShiftDegrees = defaultHueShift } = {}) {
		if (!colorEnabled) {
			return () => baseColor;
		}

		return (groupId) => ColorUtils.convertHueToHex(groupId * hueShiftDegrees, baseColor);
	}
}

// Export constants
export { DEFAULT_BASE_COLOR };

// ===== Number Formatter =====
export class NumberFormatter {
	static formatDuration(ms) {
		if (ms < 0) return "N/A";
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
		if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}

	static formatDistance(meters) {
		if (meters < 0) return "N/A";
		if (meters < 1000) return `${Math.round(meters)}m`;
		return `${(meters / 1000).toFixed(2)}km`;
	}

	static formatBreakHours(hours) {
		const totalMinutes = Math.round(hours * 60);
		const wholeHours = Math.floor(totalMinutes / 60);
		const remainingMinutes = totalMinutes % 60;
		const parts = [];
		if (wholeHours > 0) {
			parts.push(`${wholeHours}h`);
		}
		if (remainingMinutes > 0) {
			parts.push(`${remainingMinutes}min`);
		}
		if (parts.length === 0) {
			return "0 min";
		}
		return parts.join(" ");
	}

	static formatSegmentLength(kilometers) {
		const km = Number(kilometers);
		if (!Number.isFinite(km)) {
			return "n/a";
		}
		if (km >= 10) {
			return `${Math.round(km)}km`;
		}
		if (km >= 3) {
			return `${km.toFixed(1)}km`;
		}
		return `${Math.round(km * 1000)}m`;
	}
}

// ===== Geo Utils =====
export class GeoUtils {
	static formatCoordinates(lat, lon) {
		const latAbs = Math.abs(lat);
		const lonAbs = Math.abs(lon);
		const latDir = lat >= 0 ? 'N' : 'S';
		const lonDir = lon >= 0 ? 'E' : 'W';
		
		return {
			lat: latAbs,
			lon: lonAbs,
			latDir,
			lonDir,
			formatted: `${latAbs.toFixed(6)}° ${latDir}, ${lonAbs.toFixed(6)}° ${lonDir}`
		};
	}

	static createGeoHackUrl(lat, lon) {
		const { lat: latAbs, lon: lonAbs, latDir, lonDir } = GeoUtils.formatCoordinates(lat, lon);
		return `https://geohack.toolforge.org/geohack.php?params=${latAbs}_${latDir}_${lonAbs}_${lonDir}`;
	}
}

// ===== Cookie Utils =====
const COOKIE_TTL_DAYS = 30;

export class CookieUtils {
	static setCookie(key, value, days = COOKIE_TTL_DAYS) {
		if (typeof document === "undefined") {
			return;
		}

		const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
		const encoded = encodeURIComponent(value ?? "");
		document.cookie = `${key}=${encoded}; expires=${expires.toUTCString()}; path=/`;
	}

	static readCookie(key) {
		if (typeof document === "undefined") {
			return null;
		}

		const cookies = document.cookie.split(";").map((entry) => entry.trim());
		for (const cookie of cookies) {
			if (!cookie) {
				continue;
			}
			const [name, ...rest] = cookie.split("=");
			if (name === key) {
				return decodeURIComponent(rest.join("="));
			}
		}

		return null;
	}
}