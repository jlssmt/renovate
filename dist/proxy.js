import { addSecretForSanitizing } from "./util/sanitize.js";
import { logger } from "./logger/index.js";
import { parseUrl } from "./util/url.js";
import { isNonEmptyString, isUndefined } from "@sindresorhus/is";
import { createGlobalProxyAgent } from "global-agent";
//#region lib/proxy.ts
const envVars = [
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"NO_PROXY"
];
const proxyEnvVarsWithCredentials = ["HTTP_PROXY", "HTTPS_PROXY"];
let agent = false;
function sanitizeProxyCredentials(envVar) {
	const uri = parseUrl(process.env[envVar]);
	if (uri?.password) addSecretForSanitizing(uri.password, "global");
}
function bootstrap() {
	envVars.forEach((envVar) => {
		/* v8 ignore next -- env is case-insensitive on windows */
		if (isUndefined(process.env[envVar]) && !isUndefined(process.env[envVar.toLowerCase()])) process.env[envVar] = process.env[envVar.toLowerCase()];
		if (process.env[envVar]) {
			logger.debug(`Detected ${envVar} value in env`);
			process.env[envVar.toLowerCase()] = process.env[envVar];
		}
	});
	proxyEnvVarsWithCredentials.forEach(sanitizeProxyCredentials);
	if (isNonEmptyString(process.env.HTTP_PROXY) || isNonEmptyString(process.env.HTTPS_PROXY)) {
		createGlobalProxyAgent({ environmentVariableNamespace: "" });
		agent = true;
	} else agent = false;
}
function hasProxy() {
	return agent === true;
}
//#endregion
export { bootstrap, hasProxy };

//# sourceMappingURL=proxy.js.map