import { sanitizeHexColor, DEFAULT_BASE_COLOR } from "./validation.js";
import { setCookie, readCookie } from "./cookies.js";

const COOKIE_KEY = "midgard_shenanigans_color";

export class ColorManager {
	constructor() {
		this.colorEnabled = false;
		this.baseColor = DEFAULT_BASE_COLOR;
	}

	initialize() {
		const colorToken = this.readColorToken();
		const shenanigansColorCookie = readCookie(COOKIE_KEY);

		if (typeof colorToken === "string" && colorToken) {
			if (colorToken.toLowerCase() === "shenanigans") {
				this.colorEnabled = true;
				this.baseColor = sanitizeHexColor(shenanigansColorCookie ?? DEFAULT_BASE_COLOR, DEFAULT_BASE_COLOR);
			} else {
				this.baseColor = sanitizeHexColor(colorToken, DEFAULT_BASE_COLOR);
			}
		} else if (typeof shenanigansColorCookie === "string" && shenanigansColorCookie) {
			this.baseColor = sanitizeHexColor(shenanigansColorCookie, DEFAULT_BASE_COLOR);
		}

		return { colorEnabled: this.colorEnabled, baseColor: this.baseColor };
	}

	readColorToken() {
		if (typeof window === "undefined") {
			return "";
		}

		const params = new URLSearchParams(window.location.search);
		return params.get("color") ?? "";
	}

	writeColorToken(token) {
		if (typeof window === "undefined") {
			return;
		}

		const url = new URL(window.location.href);
		if (!token) {
			url.searchParams.delete("color");
		} else {
			url.searchParams.set("color", token);
		}

		window.history.replaceState({}, "", url.toString());
	}

	setColorMode(enabled, baseColor) {
		this.colorEnabled = Boolean(enabled);
		this.baseColor = sanitizeHexColor(baseColor, DEFAULT_BASE_COLOR);
		this.syncColorParam();
	}

	updateBaseColor(baseColor) {
		this.baseColor = sanitizeHexColor(baseColor, DEFAULT_BASE_COLOR);
		setCookie(COOKIE_KEY, this.baseColor);
		this.syncColorParam();
	}

	syncColorParam() {
		if (this.colorEnabled) {
			this.writeColorToken("shenanigans");
			return;
		}

		setCookie(COOKIE_KEY, this.baseColor);
		if (this.baseColor === DEFAULT_BASE_COLOR) {
			this.writeColorToken("");
		} else {
			this.writeColorToken(this.baseColor);
		}
	}

	getState() {
		return {
			colorEnabled: this.colorEnabled,
			baseColor: this.baseColor
		};
	}
}
