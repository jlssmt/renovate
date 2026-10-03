import { regEx } from "../regex.js";
import { GlobalConfig } from "../../config/global.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/exec/env.ts
const basicEnvVars = [
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"NO_PROXY",
	"http_proxy",
	"https_proxy",
	"no_proxy",
	"HOME",
	"PATH",
	"LC_ALL",
	"LANG",
	"DOCKER_HOST",
	"DOCKER_TLS_VERIFY",
	"DOCKER_CERT_PATH",
	"SSL_CERT_DIR",
	"SSL_CERT_FILE",
	"NODE_EXTRA_CA_CERTS",
	"GIT_SSL_CAPATH",
	"GIT_SSL_CAINFO",
	"PROGRAMFILES",
	"PROGRAMFILES(X86)",
	"APPDATA",
	"LOCALAPPDATA",
	"PROCESSOR_ARCHITECTURE",
	"PATHEXT",
	"COREPACK_DEFAULT_TO_LATEST",
	"COREPACK_ENABLE_NETWORK",
	"COREPACK_ENABLE_STRICT",
	"COREPACK_ENABLE_PROJECT_SPEC",
	"COREPACK_ENABLE_UNSAFE_CUSTOM_URLS",
	"COREPACK_HOME",
	"COREPACK_INTEGRITY_KEYS",
	"COREPACK_NPM_REGISTRY",
	"COREPACK_NPM_TOKEN",
	"COREPACK_NPM_USERNAME",
	"COREPACK_NPM_PASSWORD",
	"COREPACK_ROOT",
	"PNPM_WORKERS",
	"PNPM_MAX_WORKERS"
];
const hardcodedProcessEnv = { CI: "true" };
function getChildProcessEnv(customEnvVars = []) {
	const env = {};
	if (GlobalConfig.get("exposeAllEnv")) return {
		...process.env,
		...hardcodedProcessEnv
	};
	[...basicEnvVars, ...customEnvVars].forEach((envVar) => {
		if (!isUndefined(process.env[envVar])) env[envVar] = process.env[envVar];
	});
	for (const key of Object.keys(process.env)) if (regEx(/^URL_REPLACE_\d+_(?:FROM|TO)$/).test(key)) env[key] = process.env[key];
	for (const [key, value] of Object.entries(hardcodedProcessEnv)) env[key] = value;
	return env;
}
//#endregion
export { basicEnvVars, getChildProcessEnv, hardcodedProcessEnv };

//# sourceMappingURL=env.js.map