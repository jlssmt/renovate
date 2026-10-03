import { toMs } from "./pretty-time.js";
import { coerceNumber } from "./number.js";
import { getElapsedMs } from "./date.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/util/minimum-release-age.ts
/**
* Calculates the effective minimum release age in milliseconds, extended by
* the `minimumReleaseAgeBuffer` duration if configured.
*/
function calculateMinimumReleaseAgeMs(config) {
	const minimumReleaseAgeMs = isNonEmptyString(config.minimumReleaseAge) ? coerceNumber(toMs(config.minimumReleaseAge), 0) : 0;
	if (!minimumReleaseAgeMs) return 0;
	const bufferMs = isNonEmptyString(config.minimumReleaseAgeBuffer) ? coerceNumber(toMs(config.minimumReleaseAgeBuffer), 0) : 0;
	return minimumReleaseAgeMs + Math.max(bufferMs, 0);
}
/**
* Checks whether a release satisfies `minimumReleaseAge`, extended by
* `minimumReleaseAgeBuffer` if configured.
*
* Separate from `internalChecksFilter` to allow reuse, and lives here so that
* managers can import it without an import cycle.
*/
function checkMinimumReleaseAge(config, releaseTimestamp) {
	const minimumReleaseAgeMs = calculateMinimumReleaseAgeMs(config);
	if (!minimumReleaseAgeMs) return {
		isPending: false,
		minimumReleaseAgeMs,
		hasTimestamp: !!releaseTimestamp
	};
	if (releaseTimestamp) return {
		isPending: getElapsedMs(releaseTimestamp) < minimumReleaseAgeMs,
		minimumReleaseAgeMs,
		hasTimestamp: true
	};
	return {
		isPending: config.minimumReleaseAgeBehaviour === "timestamp-required",
		minimumReleaseAgeMs,
		hasTimestamp: false
	};
}
//#endregion
export { calculateMinimumReleaseAgeMs, checkMinimumReleaseAge };

//# sourceMappingURL=minimum-release-age.js.map