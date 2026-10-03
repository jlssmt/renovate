import { diag } from "@opentelemetry/api";
import { appendFile } from "node:fs/promises";
import { JsonTraceSerializer } from "@opentelemetry/otlp-transformer";
//#region lib/instrumentation/file-exporter.ts
const ExportResultCode = {
	SUCCESS: 0,
	FAILED: 1
};
var FileSpanExporter = class {
	filePath;
	stopped = false;
	pendingWrites = /* @__PURE__ */ new Set();
	constructor(filePath) {
		this.filePath = filePath;
	}
	export(spans, resultCallback) {
		if (this.stopped) {
			resultCallback({ code: ExportResultCode.FAILED });
			return;
		}
		const pending = this.writeSpans(spans).then(() => resultCallback({ code: ExportResultCode.SUCCESS }), (error) => {
			diag.error("FileSpanExporter failed to write spans", error);
			resultCallback({
				code: ExportResultCode.FAILED,
				error
			});
		});
		this.pendingWrites.add(pending);
		pending.finally(() => this.pendingWrites.delete(pending));
	}
	async writeSpans(spans) {
		const serialized = JsonTraceSerializer.serializeRequest(spans);
		/* v8 ignore start -- upstream type allows `undefined`, but the JSON serializer never returns it */
		if (serialized === void 0) return;
		/* v8 ignore stop */
		const line = `${Buffer.from(serialized).toString("utf-8")}\n`;
		await appendFile(this.filePath, line, "utf-8");
	}
	async shutdown() {
		this.stopped = true;
		await this.forceFlush();
	}
	async forceFlush() {
		await Promise.all(this.pendingWrites);
	}
};
//#endregion
export { ExportResultCode, FileSpanExporter };

//# sourceMappingURL=file-exporter.js.map