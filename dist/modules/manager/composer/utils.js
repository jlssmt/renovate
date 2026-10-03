import { GlobalConfig } from "../../../config/global.js";
import { api, id } from "../../versioning/composer/index.js";
import { coerceNumber } from "../../../util/number.js";
import { isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/composer/utils.ts
const depRequireInstall = /* @__PURE__ */ new Set(["symfony/flex"]);
function getComposerArguments(config, toolConstraint) {
	let args = "";
	if (config.composerIgnorePlatformReqs) {
		if (config.composerIgnorePlatformReqs.length === 0) {
			if (isString(toolConstraint.constraint) && api.intersects(toolConstraint.constraint, "^2.2")) args += " --ignore-platform-req='ext-*' --ignore-platform-req='lib-*'";
			else args += " --ignore-platform-reqs";
		} else config.composerIgnorePlatformReqs.forEach((req) => {
			args += ` --ignore-platform-req ${quote(req)}`;
		});
	}
	args += " --no-ansi --no-interaction";
	if (!GlobalConfig.get("allowScripts") || config.ignoreScripts) args += " --no-scripts --no-autoloader";
	if (!GlobalConfig.get("allowPlugins") || config.ignorePlugins) args += " --no-plugins";
	return args;
}
function getComposerUpdateArguments(config, toolConstraint) {
	let args = getComposerArguments(config, toolConstraint);
	if (!config.isLockFileMaintenance && !config.postUpdateOptions?.includes("composerNoMinimalChanges") && isString(toolConstraint.constraint) && api.intersects(toolConstraint.constraint, ">=2.7")) args += " --minimal-changes";
	return args;
}
function requireComposerDependencyInstallation({ packages, packagesDev }) {
	return packages.some((p) => depRequireInstall.has(p.name)) === true || packagesDev.some((p) => depRequireInstall.has(p.name)) === true;
}
function extractConstraints({ config, require, requireDev }, { pluginApiVersion }) {
	const res = { composer: "1.*" };
	const phpVersion = config?.platform.php;
	if (phpVersion) res.php = `<=${api.getMajor(phpVersion)}.${coerceNumber(api.getMinor(phpVersion))}.${coerceNumber(api.getPatch(phpVersion))}`;
	else if (require.php) res.php = require.php;
	if (require["composer/composer"]) res.composer = require["composer/composer"];
	else if (requireDev["composer/composer"]) res.composer = requireDev["composer/composer"];
	else if (require.composer) res.composer = require.composer;
	else if (requireDev.composer) res.composer = requireDev.composer;
	else if (pluginApiVersion) res.composer = `^${api.getMajor(pluginApiVersion)}.${api.getMinor(pluginApiVersion)}`;
	else if (require["composer-runtime-api"]) res.composer = `^${api.getMajor(require["composer-runtime-api"])}.${api.getMinor(require["composer-runtime-api"])}`;
	return res;
}
function isArtifactAuthEnabled(rule) {
	return !rule.artifactAuth || rule.artifactAuth.includes("composer");
}
//#endregion
export { id as composerVersioningId, extractConstraints, getComposerArguments, getComposerUpdateArguments, isArtifactAuthEnabled, requireComposerDependencyInstallation };

//# sourceMappingURL=utils.js.map