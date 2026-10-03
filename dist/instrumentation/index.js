import { pkg } from "../expose.js";
import { GetDatasourceReleasesSpanProcessor } from "../modules/datasource/span-processor.js";
import { GitOperationSpanProcessor } from "../util/git/span-processor.js";
import { getResourceDetectors } from "./detectors.js";
import { FileSpanExporter } from "./file-exporter.js";
import { getFileExporterPath, getOtlpProtocol, isFileExporterEnabled, isTraceDebuggingEnabled, isTraceSendingEnabled, isTracingEnabled, massageThrowable } from "./utils.js";
import { isPromise } from "@sindresorhus/is";
import { ClientRequest, ServerResponse } from "node:http";
import * as api from "@opentelemetry/api";
import { ProxyTracerProvider, SpanStatusCode } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPTraceExporter$1 } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPTraceExporter as OTLPTraceExporter$2 } from "@opentelemetry/exporter-trace-otlp-proto";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { BunyanInstrumentation } from "@opentelemetry/instrumentation-bunyan";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { RedisInstrumentation } from "@opentelemetry/instrumentation-redis";
import { detectResources, resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
//#region lib/instrumentation/index.ts
let instrumentations = [];
function createOtlpExporter() {
	const protocol = getOtlpProtocol();
	if (protocol === "grpc") return new OTLPTraceExporter();
	if (protocol === "http/protobuf") return new OTLPTraceExporter$2();
	return new OTLPTraceExporter$1();
}
function init() {
	const spanProcessors = [new GitOperationSpanProcessor(), new GetDatasourceReleasesSpanProcessor()];
	if (!isTracingEnabled()) {
		new NodeTracerProvider({ spanProcessors }).register({ contextManager: new AsyncLocalStorageContextManager() });
		return;
	}
	// v8 ignore if -- TODO add tests
	if (process.env.OTEL_LOG_LEVEL) api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel[process.env.OTEL_LOG_LEVEL.toUpperCase()]);
	if (isTraceDebuggingEnabled()) spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
	if (isTraceSendingEnabled()) spanProcessors.push(new BatchSpanProcessor(createOtlpExporter()));
	if (isFileExporterEnabled()) spanProcessors.push(new BatchSpanProcessor(new FileSpanExporter(getFileExporterPath())));
	const env = process.env;
	const baseResource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME ?? "renovate",
		["service.namespace"]: env.OTEL_SERVICE_NAMESPACE ?? "renovatebot.com",
		[ATTR_SERVICE_VERSION]: env.OTEL_SERVICE_VERSION ?? pkg.version
	});
	const detectedResource = detectResources({ detectors: getResourceDetectors(env) });
	const traceProvider = new NodeTracerProvider({
		resource: baseResource.merge(detectedResource),
		spanProcessors
	});
	const contextManager = new AsyncLocalStorageContextManager();
	traceProvider.register({ contextManager });
	instrumentations = [
		new HttpInstrumentation({ 
		/* v8 ignore start -- not easily testable */
applyCustomAttributesOnSpan: (span, request, response) => {
			if (request instanceof ClientRequest && request.host === `api.github.com` && request.path.endsWith(`/protection`) && response.statusCode === 404) span.setStatus({ code: SpanStatusCode.OK });
			else if (request instanceof ClientRequest && request.path === "/v2/" && request.method === "GET" && !request.getHeader("authorization") && response instanceof ServerResponse && response.getHeader("www-authenticate") && response.getHeader("docker-distribution-api-version") && response.statusCode === 401) span.setStatus({ code: SpanStatusCode.OK });
		} }),
		new BunyanInstrumentation(),
		new RedisInstrumentation()
	];
	registerInstrumentations({ instrumentations });
}
/* v8 ignore next -- not easily testable */
async function shutdown() {
	const traceProvider = getTracerProvider();
	if (traceProvider instanceof NodeTracerProvider) await traceProvider.shutdown();
	else if (traceProvider instanceof ProxyTracerProvider) {
		const delegateProvider = traceProvider.getDelegate();
		if (delegateProvider instanceof NodeTracerProvider) await delegateProvider.shutdown();
	}
}
function getTracerProvider() {
	return api.trace.getTracerProvider();
}
function getTracer() {
	return getTracerProvider().getTracer("renovate");
}
function instrument(name, fn, options = {}, context = api.context.active()) {
	return getTracer().startActiveSpan(name, options, context, (span) => {
		try {
			const ret = fn();
			if (isPromise(ret)) return ret.catch((e) => {
				span.recordException(e);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: massageThrowable(e)
				});
				throw e;
			}).finally(() => span.end());
			span.end();
			return ret;
		} catch (e) {
			span.recordException(e);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: massageThrowable(e)
			});
			span.end();
			throw e;
		}
	});
}
//#endregion
export { getTracerProvider, init, instrument, shutdown };

//# sourceMappingURL=index.js.map