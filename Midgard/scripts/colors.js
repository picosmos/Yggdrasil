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

export const makeColorScale = (colorEnabled, baseColor, { hueShiftDegrees = defaultHueShift } = {}) => {
	if (!colorEnabled) {
		return () => baseColor;
	}

	return (groupId) => convertHueToHex(groupId * hueShiftDegrees, baseColor);
};
