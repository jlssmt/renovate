import { logger } from "../../logger/index.js";
import { parseUrl } from "../url.js";
import { getConcurrentRequestsLimit } from "./rate-limits.js";
import PQueue from "p-queue";
//#region lib/util/http/queue.ts
const hostQueues = /* @__PURE__ */ new Map();
function getQueue(url) {
	const host = parseUrl(url)?.host;
	if (!host) {
		logger.debug(`No host on ${url}`);
		return null;
	}
	let queue = hostQueues.get(host);
	if (queue === void 0) {
		queue = null;
		const concurrency = getConcurrentRequestsLimit(url);
		if (concurrency) {
			logger.debug(`Using queue: host=${host}, concurrency=${concurrency}`);
			queue = new PQueue({ concurrency });
		} else logger.trace({ host }, "No concurrency limits");
	}
	hostQueues.set(host, queue);
	return queue;
}
function clear() {
	hostQueues.clear();
}
//#endregion
export { clear, getQueue };

//# sourceMappingURL=queue.js.map