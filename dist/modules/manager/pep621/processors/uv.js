import "../../../../constants/error-messages.js";
import { regEx } from "../../../../util/regex.js";
import { coerceArray } from "../../../../util/array.js";
import { logger } from "../../../../logger/index.js";
import { parseUrl } from "../../../../util/url.js";
import { findLocalSiblingOrParent, readLocalFile } from "../../../../util/fs/index.js";
import { Result } from "../../../../util/result.js";
import { findPypiIndexCredentials } from "../../../datasource/pypi/host-rules.js";
import { PypiDatasource } from "../../../datasource/pypi/index.js";
import { applyGitSource, artifactErrorResult, resolveToolConstraint, updateLockFile } from "../../util.js";
import { withGitEnvironment } from "../../../../util/git/exec.js";
import { BasePyProjectProcessor } from "./abstract.js";
import { depTypes } from "../utils.js";
import { UvLockfile } from "../schema.js";
import { isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/pep621/processors/uv.ts
const uvUpdateCMD = "uv lock";
const gitExec = withGitEnvironment(["pep621"]);
function isUvIndexSource(source) {
	return "index" in source;
}
var UvProcessor = class extends BasePyProjectProcessor {
	lockfileName = "uv.lock";
	process(project, deps) {
		const uv = project.tool?.uv;
		if (!uv) return deps;
		const hasExplicitDefault = uv.index?.some((index) => index.default && index.explicit);
		const defaultIndex = uv.index?.find((index) => index.default && !index.explicit);
		const implicitIndexUrls = uv.index?.filter((index) => !index.explicit && index.name !== defaultIndex?.name)?.map(({ url }) => url);
		const devDependencies = uv["dev-dependencies"];
		if (devDependencies) deps.push(...devDependencies);
		if (uv.sources || defaultIndex || implicitIndexUrls) for (const dep of deps) {
			/* v8 ignore next -- needs test */
			if (!dep.packageName) continue;
			if (dep.depType === "requires-python") continue;
			const depSources = uv.sources?.[dep.packageName];
			if (depSources) {
				dep.depType = depTypes.uvSources;
				if (depSources.every(isUvIndexSource)) {
					const registryUrls = [];
					for (const depSource of depSources) {
						const index = uv.index?.find(({ name }) => name === depSource.index);
						if (index) registryUrls.push(index.url);
					}
					if (registryUrls.length) dep.registryUrls = [...new Set(registryUrls)];
				} else if (depSources.length === 1) {
					const depSource = depSources[0];
					if ("git" in depSource) applyGitSource(dep, depSource.git, depSource.rev, depSource.tag, depSource.branch);
					else if ("url" in depSource) dep.skipReason = "unsupported-url";
					else if ("path" in depSource) dep.skipReason = "path-dependency";
					else if ("workspace" in depSource) dep.skipReason = "inherited-dependency";
					else dep.skipReason = "unknown-registry";
				} else dep.skipReason = "unsupported";
			} else {
				if (hasExplicitDefault) dep.registryUrls = [];
				else if (defaultIndex) dep.registryUrls = [defaultIndex.url];
				if (implicitIndexUrls?.length) dep.registryUrls = implicitIndexUrls.concat(dep.registryUrls ?? PypiDatasource.defaultURL);
			}
		}
		return deps;
	}
	async extractLockedVersions(project, deps, packageFile) {
		const lockFileName = await findLocalSiblingOrParent(packageFile, this.lockfileName);
		if (lockFileName === null) logger.debug({ packageFile }, `No uv lock file found`);
		else {
			const lockFileContent = await readLocalFile(lockFileName, "utf8");
			if (lockFileContent) {
				const { val: lockFileMapping, err } = Result.parse(lockFileContent, UvLockfile).unwrap();
				if (err) logger.debug({
					packageFile,
					err
				}, `Error parsing uv lock file`);
				else for (const dep of deps) {
					const packageName = dep.packageName;
					if (packageName && packageName in lockFileMapping) dep.lockedVersion = lockFileMapping[packageName];
				}
			}
		}
		return Promise.resolve(deps);
	}
	async updateArtifacts(updateArtifact, project) {
		const { config, updatedDeps, packageFileName } = updateArtifact;
		const { isLockFileMaintenance } = config;
		const lockFileName = await findLocalSiblingOrParent(packageFileName, "uv.lock");
		if (lockFileName === null) {
			logger.debug({ packageFileName }, `No uv lock file found`);
			return null;
		}
		try {
			const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
			if (!existingLockFileContent) {
				logger.debug("No uv.lock found");
				return null;
			}
			const pythonConstraint = {
				toolName: "python",
				constraint: await resolveToolConstraint(config, "python", () => project.project?.["requires-python"])
			};
			const uvConstraint = {
				toolName: "uv",
				constraint: await resolveToolConstraint(config, "uv", () => project.tool?.uv?.["required-version"])
			};
			const execOptions = {
				cwdFile: packageFileName,
				extraEnv: {
					...await getUvExtraIndexUrl(project, updateArtifact.updatedDeps),
					...await getUvIndexCredentials(project)
				},
				docker: {},
				toolConstraints: [pythonConstraint, uvConstraint]
			};
			let cmd;
			if (isLockFileMaintenance) cmd = `${uvUpdateCMD} --upgrade`;
			else cmd = generateCMD(updatedDeps);
			return await updateLockFile({
				lockFileName,
				existingLockFileContent,
				run: () => gitExec(cmd, execOptions)
			});
		} catch (err) {
			if (err.message === "temporary-error") throw err;
			logger.debug({ err }, "Failed to update uv lock file");
			return artifactErrorResult(lockFileName, err);
		}
	}
};
function generateCMD(updatedDeps) {
	const deps = [];
	for (const dep of updatedDeps) switch (dep.depType) {
		case depTypes.optionalDependencies:
			deps.push(dep.depName);
			break;
		case depTypes.uvDevDependencies:
		case depTypes.uvSources:
			deps.push(dep.depName);
			break;
		case depTypes.buildSystemRequires: break;
		default: deps.push(dep.packageName);
	}
	return `${uvUpdateCMD} ${deps.map((dep) => `--upgrade-package ${quote(dep)}`).join(" ")}`;
}
async function getUvExtraIndexUrl(project, deps) {
	const pyPiRegistryUrls = deps.filter((dep) => dep.datasource === PypiDatasource.id).filter((dep) => {
		const sources = project.tool?.uv?.sources;
		const packageName = dep.packageName;
		return !sources || !(packageName in sources);
	}).flatMap((dep) => dep.registryUrls).filter(isString).filter((registryUrl) => {
		const configuredIndexUrls = coerceArray(project.tool?.uv?.index?.map(({ url }) => url));
		return registryUrl !== PypiDatasource.defaultURL && !configuredIndexUrls.includes(registryUrl);
	});
	const registryUrls = new Set(pyPiRegistryUrls);
	const extraIndexUrls = [];
	for (const registryUrl of registryUrls) {
		const parsedUrl = parseUrl(registryUrl);
		if (!parsedUrl) continue;
		const { username, password } = await findPypiIndexCredentials(parsedUrl.toString());
		if (username || password) {
			// v8 ignore else -- needs a host rule carrying only one of the two
			if (username) parsedUrl.username = username;
			// v8 ignore else -- needs a host rule carrying only one of the two
			if (password) parsedUrl.password = password;
		}
		extraIndexUrls.push(parsedUrl.toString());
	}
	return { UV_EXTRA_INDEX_URL: extraIndexUrls.join(" ") };
}
async function getUvIndexCredentials(project) {
	const uv_indexes = project.tool?.uv?.index;
	if (!uv_indexes) return {};
	const entries = [];
	for (const { name, url } of uv_indexes) {
		const parsedUrl = parseUrl(url);
		/* v8 ignore next -- needs test */
		if (!parsedUrl) continue;
		if (!name) continue;
		const { username, password } = await findPypiIndexCredentials(parsedUrl.toString());
		const NAME = name.toUpperCase().replace(regEx(/[^A-Z0-9]/g), "_");
		// v8 ignore else -- needs a host rule carrying only one of the two
		if (username) entries.push([`UV_INDEX_${NAME}_USERNAME`, username]);
		// v8 ignore else -- needs a host rule carrying only one of the two
		if (password) entries.push([`UV_INDEX_${NAME}_PASSWORD`, password]);
	}
	return Object.fromEntries(entries);
}
//#endregion
export { UvProcessor };

//# sourceMappingURL=uv.js.map