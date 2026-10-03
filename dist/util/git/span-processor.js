import { ATTR_VCS_GIT_OPERATION_TYPE } from "../../instrumentation/types.js";
import { GitOperationStats } from "../stats.js";
//#region lib/util/git/span-processor.ts
var GitOperationSpanProcessor = class {
	forceFlush() {
		return Promise.resolve();
	}
	onStart(_span, _parentContext) {}
	// v8 ignore next -- TODO: add test #40625
	onEnd(span) {
		if (!span.ended) return;
		if (!span.attributes["vcs.git.operation.type"]) return;
		const start = span.startTime;
		const end = span.endTime;
		const startNs = start[0] * 1e9 + start[1];
		const ns = end[0] * 1e9 + end[1] - startNs;
		GitOperationStats.write(span.attributes[ATTR_VCS_GIT_OPERATION_TYPE], ns / 1e6);
	}
	shutdown() {
		return Promise.resolve();
	}
};
//#endregion
export { GitOperationSpanProcessor };

//# sourceMappingURL=span-processor.js.map