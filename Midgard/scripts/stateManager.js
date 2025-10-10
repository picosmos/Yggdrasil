import { readUrlState, writeUrlState } from "./url.js";
import { setCookie, readCookie } from "./cookies.js";

const MENU_COOKIE_KEY = "midgard_menu_open";

export class StateManager {
	constructor(defaultState, urlStateOptions) {
		this.defaultState = defaultState;
		this.urlStateOptions = urlStateOptions;
		this.state = { ...defaultState };
	}

	initialize() {
		this.state = readUrlState(this.defaultState, this.urlStateOptions);

		const menuCookie = readCookie(MENU_COOKIE_KEY);
		const menuOpen = typeof menuCookie === "string" && menuCookie.length > 0 
			? menuCookie === "1" 
			: false;

		return { state: this.state, menuOpen };
	}

	updateState(partial) {
		this.state = { ...this.state, ...partial };
	}

	persistState(partial) {
		this.updateState(partial);
		writeUrlState(this.defaultState, partial, this.urlStateOptions);
	}

	persistMenuState(isOpen) {
		setCookie(MENU_COOKIE_KEY, isOpen ? "1" : "0");
	}

	getState() {
		return this.state;
	}

	get(key) {
		return this.state[key];
	}

	set(key, value) {
		this.state[key] = value;
	}
}
