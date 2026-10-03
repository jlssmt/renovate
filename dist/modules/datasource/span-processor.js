import { ATTR_RENOVATE_DATASOURCE, ATTR_RENOVATE_PACKAGE_NAME } from "../../instrumentation/types.js";
import { GetDatasourceReleasesStats } from "../../util/stats.js";
import { ATTR_CODE_FUNCTION_NAME } from "@opentelemetry/semantic-conventions";
//#region lib/modules/datasource/span-processor.ts
var GetDatasourceReleasesSpanProcessor = class {
	forceFlush() {
		return Promise.resolve();
	}
	onStart(_span, _parentContext) {}
	onEnd(span) {
		if (!span.ended) return;
		if (span.attributes[ATTR_CODE_FUNCTION_NAME] !== "getReleases") return;
		const datasource = span.attributes[ATTR_RENOVATE_DATASOURCE];
		const registryUrl = span.attributes["renovate.registryUrl"] ?? "";
		const packageName = span.attributes[ATTR_RENOVATE_PACKAGE_NAME];
		if (!datasource || !packageName) return;
		const durationMs = span.duration[0] * 1e3 + span.duration[1] / 1e6;
		GetDatasourceReleasesStats.write(datasource, registryUrl, packageName, durationMs);
	}
	shutdown() {
		return Promise.resolve();
	}
};
//#endregion
export { GetDatasourceReleasesSpanProcessor };

//# sourceMappingURL=span-processor.js.map