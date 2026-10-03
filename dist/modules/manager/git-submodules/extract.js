import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { api, id } from "../../versioning/semver/index.js";
import { getHttpUrl } from "../../../util/git/url.js";
import { createSimpleGit } from "../../../util/git/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import upath from "upath";
//#region lib/modules/manager/git-submodules/extract.ts
async function getUrl(git, gitModulesPath, submoduleName) {
	const path = (await createSimpleGit().raw([
		"config",
		"--file",
		gitModulesPath,
		"--get",
		`submodule.${submoduleName}.url`
	]))?.trim();
	if (!path?.startsWith("../") && !path?.startsWith("./")) return path;
	const remoteUrl = (await git.raw([
		"config",
		"--get",
		"remote.origin.url"
	])).trim();
	return new URL(path, `${remoteUrl}/`).href;
}
async function getBranch(git, gitModulesPath, submoduleName) {
	const branchFromConfig = (await createSimpleGit().raw([
		"config",
		"--file",
		gitModulesPath,
		"--get",
		`submodule.${submoduleName}.branch`
	])).trim();
	return branchFromConfig === "." ? (await git.branch(["--list"])).current.trim() : branchFromConfig || null;
}
async function getModules(git, gitModulesPath) {
	const res = [];
	try {
		const modules = (await git.raw([
			"config",
			"--file",
			gitModulesPath,
			"--get-regexp",
			"\\.path"
		])).trim().split(regEx(/\n/)).filter((s) => !!s);
		for (const line of modules) {
			const [, name, path] = line.split(regEx(/submodule\.(?<name>.+?)\.path\s(?<path>.+)/));
			res.push({
				name,
				path
			});
		}
	} catch (err) /* istanbul ignore next */ {
		logger.warn({ err }, "Error getting git submodules during extract");
	}
	return res;
}
async function extractPackageFile(_content, packageFile, _config) {
	const localDir = GlobalConfig.get("localDir");
	const git = createSimpleGit({ config: { baseDir: localDir } });
	const gitModulesPath = upath.join(localDir, packageFile);
	const depNames = await getModules(git, gitModulesPath);
	if (!depNames.length) return null;
	const deps = [];
	for (const { name, path } of depNames) try {
		const [currentDigest] = (await git.subModule([
			"status",
			"--cached",
			path
		])).trim().replace(regEx(/^[-+]/), "").split(regEx(/\s/));
		const subModuleUrl = await getUrl(git, gitModulesPath, name);
		const httpSubModuleUrl = getHttpUrl(subModuleUrl);
		const branch = await getBranch(git, gitModulesPath, name);
		deps.push({
			depName: path,
			packageName: httpSubModuleUrl,
			sourceUrl: httpSubModuleUrl.replace(regEx(/\.git$/), ""),
			currentValue: branch ?? void 0,
			currentDigest,
			...api.isVersion(branch) ? { versioning: id } : {}
		});
	} catch (err) /* istanbul ignore next */ {
		logger.warn({
			err,
			packageFile
		}, "Error mapping git submodules during extraction");
	}
	return {
		deps,
		datasource: GitRefsDatasource.id
	};
}
//#endregion
export { extractPackageFile as default };

//# sourceMappingURL=extract.js.map