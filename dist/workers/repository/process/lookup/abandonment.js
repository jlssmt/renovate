import { logger } from "../../../../logger/index.js";
import { toMs } from "../../../../util/pretty-time.js";
import { AbandonedPackageStats } from "../../../../util/stats.js";
import { DateTime } from "luxon";
//#region lib/workers/repository/process/lookup/abandonment.ts
function calculateAbandonment(releaseResult, config) {
	const { lookupName } = releaseResult;
	const { abandonmentThreshold } = config;
	if (!abandonmentThreshold) {
		logger.trace({ lookupName }, "No abandonmentThreshold defined, skipping abandonment check");
		return releaseResult;
	}
	const abandonmentThresholdMs = toMs(abandonmentThreshold);
	if (!abandonmentThresholdMs) {
		logger.trace({
			lookupName,
			abandonmentThreshold
		}, "Could not parse abandonmentThreshold to milliseconds, skipping abandonment check");
		return releaseResult;
	}
	const { mostRecentTimestamp } = releaseResult;
	if (!mostRecentTimestamp) {
		logger.trace({ lookupName }, "No mostRecentTimestamp value found, skipping abandonment check");
		return releaseResult;
	}
	const abandonmentDate = DateTime.fromISO(mostRecentTimestamp).plus({ milliseconds: abandonmentThresholdMs });
	const now = DateTime.local();
	const isAbandoned = abandonmentDate < now;
	releaseResult.isAbandoned = isAbandoned;
	if (isAbandoned) logger.debug(`Package abandonment detected: ${config.packageName} (${config.datasource}) - most recent release: ${mostRecentTimestamp}`);
	logger.trace({
		lookupName,
		mostRecentTimestamp,
		abandonmentThreshold,
		abandonmentThresholdMs,
		abandonmentDate: abandonmentDate.toISO(),
		now: now.toISO(),
		isAbandoned
	}, "Calculated abandonment status");
	if (isAbandoned) {
		const { datasource, packageName } = config;
		AbandonedPackageStats.write(datasource, packageName, mostRecentTimestamp);
	}
	return releaseResult;
}
//#endregion
export { calculateAbandonment };

//# sourceMappingURL=abandonment.js.map