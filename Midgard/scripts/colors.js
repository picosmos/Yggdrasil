import { Hsluv } from "../node_modules/hsluv/dist/hsluv.mjs";

const defaultSaturation = 100;
const defaultLightness = 37;
const defaultHueShift = 77;

let sharedConverter;

const getConverter = () => {
	sharedConverter = sharedConverter ?? new Hsluv();
	return sharedConverter;
};

export const convertHueToHex = (hue, baseColor, saturation = defaultSaturation, lightness = defaultLightness) => {
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
};

export const blendColors = (hexColor1, hexColor2) => {
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
};

export const makeColorScale = (colorEnabled, baseColor, { hueShiftDegrees = defaultHueShift } = {}) => {
	if (!colorEnabled) {
		return () => baseColor;
	}

	return (groupId) => convertHueToHex(groupId * hueShiftDegrees, baseColor);
};
