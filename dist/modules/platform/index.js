import { PLATFORM_NOT_FOUND } from "../../constants/error-messages.js";
import { coerceArray } from "../../util/array.js";
import { logger } from "../../logger/index.js";
import { parseUrl } from "../../util/url.js";
import { add } from "../../util/host-rules.js";
import { setNoVerify } from "../../util/git/config.js";
import { setPrivateKey } from "../../util/git/private-key.js";
import { setGitAuthor } from "../../util/git/index.js";
import { setPlatformScmApi } from "./scm.js";
import api from "./api.js";
//#region lib/modules/platform/index.ts
function getPlatformList() {
	return Array.from(api.keys());
}
let _platform;
const platform = new Proxy({}, { get(_target, prop) {
	if (!_platform) throw new Error(PLATFORM_NOT_FOUND);
	return _platform[prop];
} });
function setPlatformApi(name) {
	if (!api.has(name)) throw new Error(`Init: Platform "${name}" not found. Must be one of: ${getPlatformList().join(", ")}`);
	_platform = api.get(name);
	setPlatformScmApi(name);
}
async function initPlatform(config) {
	setPrivateKey(config.gitPrivateKey, config.gitPrivateKeyPassphrase);
	setNoVerify(coerceArray(config.gitNoVerify));
	setPlatformApi(config.platform);
	const platformInfo = await platform.initPlatform(config);
	const returnConfig = {
		...config,
		...platformInfo,
		hostRules: [...coerceArray(platformInfo?.hostRules), ...coerceArray(config.hostRules)]
	};
	// v8 ignore else -- TODO: add test #40625
	if (config?.gitAuthor) {
		logger.debug(`Using configured gitAuthor (${config.gitAuthor})`);
		returnConfig.gitAuthor = config.gitAuthor;
	} else if (platformInfo?.gitAuthor) {
		logger.debug(`Using platform gitAuthor: ${String(platformInfo.gitAuthor)}`);
		returnConfig.gitAuthor = platformInfo.gitAuthor;
	}
	setGitAuthor(returnConfig.gitAuthor);
	const platformRule = { matchHost: parseUrl(returnConfig.endpoint)?.hostname };
	if (returnConfig.token) config.token = returnConfig.token;
	[
		"token",
		"username",
		"password"
	].forEach((field) => {
		if (config[field]) {
			platformRule[field] = config[field];
			delete returnConfig[field];
		}
	});
	const typedPlatformRule = {
		...platformRule,
		hostType: returnConfig.platform
	};
	returnConfig.hostRules.push(typedPlatformRule);
	add(typedPlatformRule);
	return returnConfig;
}
//#endregion
export { getPlatformList, initPlatform, platform, setPlatformApi };

//# sourceMappingURL=index.js.map