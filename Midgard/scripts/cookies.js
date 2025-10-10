const COOKIE_TTL_DAYS = 30;

export const setCookie = (key, value, days = COOKIE_TTL_DAYS) => {
	if (typeof document === "undefined") {
		return;
	}

	const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
	const encoded = encodeURIComponent(value ?? "");
	document.cookie = `${key}=${encoded}; expires=${expires.toUTCString()}; path=/`;
};

export const readCookie = (key) => {
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
};
