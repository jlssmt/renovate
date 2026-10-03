import { resetGlobalLogLevelRemaps } from "../../logger/remap.js";
import { logger } from "../../logger/index.js";
import { add, filterAllowedHeaders } from "../../util/host-rules.js";
import { applySecretsAndVariablesToConfig } from "../../config/secrets.js";
import { cleanup, init } from "../../util/cache/package/index.js";
import { setHttpRateLimits } from "../../util/http/rate-limits.js";
import { setMaxLimit } from "./limits.js";
import { validateGitVersion } from "../../util/git/index.js";
import { setEmojiConfig } from "../../util/emoji.js";
import { initPlatform } from "../../modules/platform/index.js";
import { initMergeConfidence } from "../../util/merge-confidence/index.js";
import fs from "fs-extra";
import upath from "upath";
import os from "node:os";
//#region lib/workers/global/initialize.ts
async function setDirectories(input) {
	const config = { ...input };
	process.env.TMPDIR = process.env.RENOVATE_TMPDIR ?? os.tmpdir();
	if (config.baseDir) logger.debug(`Using configured baseDir: ${config.baseDir}`);
	else {
		config.baseDir = upath.join(process.env.TMPDIR, "renovate");
		logger.debug(`Using baseDir: ${config.baseDir}`);
	}
	await fs.ensureDir(config.baseDir);
	if (config.cacheDir) logger.debug(`Using configured cacheDir: ${config.cacheDir}`);
	else {
		config.cacheDir = upath.join(config.baseDir, "cache");
		logger.debug(`Using cacheDir: ${config.cacheDir}`);
	}
	await fs.ensureDir(config.cacheDir);
	if (config.binarySource === "docker" || config.binarySource === "install") {
		if (config.containerbaseDir) logger.debug(`Using configured containerbaseDir: ${config.containerbaseDir}`);
		else {
			config.containerbaseDir = upath.join(config.cacheDir, "containerbase");
			logger.debug(`Using containerbaseDir: ${config.containerbaseDir}`);
		}
		await fs.ensureDir(config.containerbaseDir);
	}
	return config;
}
function limitCommitsPerRun(config) {
	const limit = config.prCommitsPerRunLimit;
	setMaxLimit("Commits", typeof limit === "number" && limit > 0 ? limit : null);
}
async function checkVersions() {
	if (!await validateGitVersion()) throw new Error("Init: git version needs upgrading");
}
function setGlobalHostRules(config, warnOnDenied = true) {
	if (config.hostRules) {
		logger.debug("Setting global hostRules");
		applySecretsAndVariablesToConfig({
			config,
			deleteVariables: false,
			deleteSecrets: false
		});
		const rules = filterAllowedHeaders(config.hostRules, config.allowedHeaders, warnOnDenied);
		for (const rule of rules) add(rule, {
			allowedHeaders: config.allowedHeaders,
			trusted: true
		});
	}
}
function configureThirdPartyLibraries(config) {
	if (!config.useCloudMetadataServices) {
		logger.debug("Disabling the use of cloud metadata services");
		process.env.AWS_EC2_METADATA_DISABLED = "true";
		process.env.METADATA_SERVER_DETECTION = "none";
	}
}
async function globalInitialize(config_) {
	let config = config_;
	setHttpRateLimits();
	await checkVersions();
	setGlobalHostRules(config);
	config = await initPlatform(config);
	config = await setDirectories(config);
	await init(config);
	limitCommitsPerRun(config);
	setEmojiConfig(config);
	setGlobalHostRules(config, false);
	configureThirdPartyLibraries(config);
	await initMergeConfidence(config);
	return config;
}
async function globalFinalize(config) {
	await cleanup(config);
	resetGlobalLogLevelRemaps();
}
//#endregion
export { globalFinalize, globalInitialize };

//# sourceMappingURL=initialize.js.map