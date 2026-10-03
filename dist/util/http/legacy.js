import { parseUrl } from "../url.js";
import { RequestError } from "got";
//#region lib/util/http/legacy.ts
Object.defineProperty(RequestError.prototype, "statusCode", {
	get: function statusCode() {
		return this.response?.statusCode;
	},
	configurable: true
});
Object.defineProperty(RequestError.prototype, "body", {
	get: function body() {
		return this.response?.body;
	},
	set: function body(value) {
		if (this.response) this.response.body = value;
	},
	configurable: true
});
Object.defineProperty(RequestError.prototype, "headers", {
	get: function headers() {
		return this.response?.headers;
	},
	configurable: true
});
Object.defineProperty(RequestError.prototype, "url", {
	get: function url() {
		return this.response?.url;
	},
	configurable: true
});
Object.defineProperty(RequestError.prototype, "host", {
	get: function url() {
		const urlStr = this.response?.url;
		return (urlStr ? parseUrl(urlStr) : null)?.host;
	},
	configurable: true
});
//#endregion
export {};

//# sourceMappingURL=legacy.js.map