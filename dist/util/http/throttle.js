import { logger } from "../../logger/index.js";
import { parseUrl } from "../url.js";
import { getThrottleIntervalMs } from "./rate-limits.js";
import pThrottle from "p-throttle";
//#region lib/util/http/throttle.ts
const hostThrottles = /* @__PURE__ */ new Map();
var Throttle = class {
	throttle;
	constructor(interval) {
		this.throttle = pThrottle({
			strict: true,
			limit: 1,
			interval
		});
	}
	add(task) {
		return this.throttle(task)();
	}
};
function getThrottle(url) {
	const host = parseUrl(url)?.host;
	if (!host) {
		logger.debug(`No host on ${url}`);
		return null;
	}
	let throttle = hostThrottles.get(host);
	if (throttle === void 0) {
		throttle = null;
		const throttleMs = getThrottleIntervalMs(url);
		if (throttleMs) {
			logger.debug(`Using throttle ${throttleMs} intervalMs for host ${host}`);
			throttle = new Throttle(throttleMs);
		} else logger.trace({ host }, "No throttle");
	}
	hostThrottles.set(host, throttle);
	return throttle;
}
function clear() {
	hostThrottles.clear();
}
//#endregion
export { Throttle, clear, getThrottle };

//# sourceMappingURL=throttle.js.map