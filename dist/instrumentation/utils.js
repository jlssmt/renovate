import { getEnv } from "../util/env.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/instrumentation/utils.ts
const otlpProtocols = [
	"grpc",
	"http/json",
	"http/protobuf"
];
function getOtlpProtocol() {
	const protocol = getEnv().OTEL_EXPORTER_OTLP_TRACES_PROTOCOL ?? getEnv().OTEL_EXPORTER_OTLP_PROTOCOL;
	return otlpProtocols.includes(protocol) ? protocol : "http/json";
}
function isTracingEnabled() {
	return isTraceDebuggingEnabled() || isTraceSendingEnabled() || isFileExporterEnabled();
}
function isTraceDebuggingEnabled() {
	return !!getEnv().RENOVATE_TRACING_CONSOLE_EXPORTER;
}
function isTraceSendingEnabled() {
	return !!getEnv().OTEL_EXPORTER_OTLP_ENDPOINT;
}
function isFileExporterEnabled() {
	return !!getEnv().RENOVATE_TRACING_FILE_EXPORTER_PATH;
}
function getFileExporterPath() {
	return getEnv().RENOVATE_TRACING_FILE_EXPORTER_PATH;
}
function massageThrowable(e) {
	if (isNullOrUndefined(e)) return;
	if (e instanceof Error) return e.message;
	return String(e);
}
//#endregion
export { getFileExporterPath, getOtlpProtocol, isFileExporterEnabled, isTraceDebuggingEnabled, isTraceSendingEnabled, isTracingEnabled, massageThrowable };

//# sourceMappingURL=utils.js.map