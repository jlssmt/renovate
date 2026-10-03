import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { platform } from "../../../../modules/platform/index.js";
import { DateTime } from "luxon";
//#region lib/workers/repository/update/pr/pr-reuse.ts
const REOPEN_THRESHOLD_MILLIS = 6048e5;
async function tryReuseAutoclosedPr(branchName, newTitle) {
	if (!platform.tryReuseAutoclosedPr) return null;
	const autoclosedPr = await platform.findPr({
		branchName,
		state: "closed"
	});
	if (!autoclosedPr) return null;
	if (!autoclosedPr.title.endsWith(" - autoclosed")) return null;
	const closedAt = autoclosedPr.closedAt;
	if (!closedAt) return null;
	if (DateTime.fromISO(closedAt).diffNow().negate().toMillis() > REOPEN_THRESHOLD_MILLIS) {
		logger.debug(`Found autoclosed PR ${autoclosedPr.number} but it is too old to reopen`);
		return null;
	}
	logger.debug({ number: autoclosedPr.number }, "Found autoclosed PR for branch");
	if (GlobalConfig.get("dryRun")) {
		logger.info("DRY-RUN: Would try to reopen autoclosed PR");
		return null;
	}
	try {
		return await platform.tryReuseAutoclosedPr(autoclosedPr, newTitle);
	} catch (err) {
		logger.debug({ err }, `Error trying to reuse existing PR with branch=${branchName}`);
		return null;
	}
}
//#endregion
export { tryReuseAutoclosedPr };

//# sourceMappingURL=pr-reuse.js.map