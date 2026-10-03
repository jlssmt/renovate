#!/usr/bin/env node
import { require_punycode } from "./punycode.js";
import "source-map-support/register.js";
require_punycode();
(async () => {
	const otel = await import("./instrumentation/index.js");
	otel.init();
	const logger = await import("./logger/index.js");
	/* v8 ignore next -- not easily testable */
	process.on("unhandledRejection", (err) => {
		logger.logger.error({ err }, "unhandledRejection");
		process.exitCode ??= 1;
	});
	await logger.init();
	(await import("./proxy.js")).bootstrap();
	const { parseEarlyFlags } = await import("./workers/global/config/parse/cli.js");
	parseEarlyFlags();
	const { start } = await import("./workers/global/index.js");
	process.exitCode = await otel.instrument("run", start);
	await otel.shutdown();
	/* v8 ignore if -- no test required */
	if (process.env.RENOVATE_X_HARD_EXIT) process.exit(process.exitCode);
})();
//#endregion
export {};

//# sourceMappingURL=renovate.js.map