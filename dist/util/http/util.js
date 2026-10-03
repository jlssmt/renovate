import "../../constants/error-messages.js";
import { clone } from "../clone.js";
//#region lib/util/http/util.ts
function copyResponse({ statusCode, headers, body, cached }, deep) {
	const res = {
		statusCode,
		headers,
		body
	};
	if (deep) {
		res.headers = clone(headers);
		res.body = body instanceof Uint8Array ? body.subarray() : clone(body);
	}
	if (cached) res.cached = true;
	return res;
}
/**
* The log message for a request the HTTP layer refused, distinguishing a host blocked by the internal-host policy from one an administrator disabled.
*
* Both are reported the same way by their callers - traced and swallowed - so only the wording tells them apart in the logs.
*/
function refusedHostMessage(err) {
	return err.message === "host-blocked" ? "Host blocked" : "Host disabled";
}
//#endregion
export { copyResponse, refusedHostMessage };

//# sourceMappingURL=util.js.map