import "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { ensureCacheDir, findLocalSiblingOrParent, isValidLocalPath, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { filterMap } from "../../../util/filter-map.js";
import { isValid as isVersion } from "../../versioning/semver/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileAddition, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { withGitEnvironment } from "../../../util/git/exec.js";
import { getExtraDepsNotice } from "./artifacts-extra.js";
import { getGoModulesInTidyOrder } from "./package-tree.js";
import { isString } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
import semver from "semver";
//#region lib/modules/manager/gomod/artifacts.ts
const { major: major$1, valid: valid$1 } = semver;
const gitExec = withGitEnvironment(["go"]);
async function getUpdateImportPathCmds(updatedDeps, config) {
	const invalidMajorDeps = updatedDeps.filter(({ newVersion }) => !valid$1(newVersion));
	if (invalidMajorDeps.length > 0) invalidMajorDeps.forEach(({ depName }) => logger.warn({ depName }, "Ignoring dependency: Could not get major version"));
	const updateImportCommands = updatedDeps.filter(({ newVersion }) => valid$1(newVersion) && !newVersion.endsWith("+incompatible")).map(({ depName, newVersion }) => ({
		depName,
		newMajor: major$1(newVersion)
	})).filter(({ depName, newMajor }) => depName.startsWith("gopkg.in/") || newMajor > 1).map(({ depName, newMajor }) => `mod upgrade --mod-name=${quote(depName)} -t=${newMajor}`);
	if (updateImportCommands.length > 0) {
		let installMarwanModArgs = "install github.com/marwan-at-work/mod/cmd/mod@latest";
		const gomodModCompatibility = await resolveToolConstraint(config, "gomodMod");
		if (gomodModCompatibility) {
			if (gomodModCompatibility.startsWith("v") && isVersion(gomodModCompatibility.replace(regEx(/^v/), ""))) installMarwanModArgs = installMarwanModArgs.replace(regEx(/@latest$/), `@${gomodModCompatibility}`);
			else logger.debug({ gomodModCompatibility }, "marwan-at-work/mod compatibility range is not valid - skipping");
		} else logger.debug("No marwan-at-work/mod compatibility range found - installing marwan-at-work/mod latest");
		updateImportCommands.unshift(`go ${installMarwanModArgs}`);
	}
	return updateImportCommands;
}
function useModcacherw(goVersion) {
	if (!isString(goVersion)) return true;
	return semver.intersects(goVersion, `>=1.14`);
}
async function updateArtifacts({ packageFileName: goModFileName, updatedDeps, newPackageFileContent: newGoModContent, config }) {
	logger.debug(`gomod.updateArtifacts(${goModFileName})`);
	const sumFileName = goModFileName.replace(regEx(/\.mod$/), ".sum");
	if (!await readLocalFile(sumFileName)) {
		logger.debug("No go.sum found");
		return null;
	}
	const goModDir = upath.dirname(goModFileName);
	const goModFileBaseName = upath.basename(goModFileName);
	const modFileFlag = goModFileBaseName === "go.mod" ? "" : ` -modfile=${quote(goModFileBaseName)}`;
	const vendorDir = await findLocalSiblingOrParent(goModFileName, "vendor");
	const vendorModulesFileName = upath.join(vendorDir ?? "", "modules.txt");
	const useVendor = !!config.postUpdateOptions?.includes("gomodVendor") || !config.postUpdateOptions?.includes("gomodSkipVendor") && vendorDir && await readLocalFile(vendorModulesFileName) !== null;
	let massagedGoMod = newGoModContent;
	const useGoGenerate = !!config.postUpdateOptions?.includes("goGenerate");
	const goGenerateAllowed = GlobalConfig.get("allowedUnsafeExecutions")?.includes("goGenerate");
	if (config.postUpdateOptions?.includes("gomodMassage")) {
		massagedGoMod = massagedGoMod.split("\n").map((line) => {
			if (line.trim().startsWith("//")) return line.replace(")", "renovate-replace-bracket");
			return line;
		}).join("\n");
		const inlineReplaceRegEx = regEx(/(?<newline>\r?\n)(?<directive>replace\s+[^\s]+\s+=>\s+\.\.\/.*)/g);
		const inlineCommentOut = "$<newline>// renovate-replace $<directive>";
		const blockReplaceRegEx = regEx(/(?:\r?\n)replace\s*\([^)]+\s*\)/g);
		/**
		* replacerFunction for commenting out replace blocks
		* @param match A string representing a golang replace directive block
		* @returns A commented out block with // renovate-replace
		*/
		function blockCommentOut(match) {
			return match.replace(regEx(/(?<newline>\r?\n)/g), "$<newline>// renovate-replace ");
		}
		massagedGoMod = massagedGoMod.replace(inlineReplaceRegEx, inlineCommentOut).replace(blockReplaceRegEx, blockCommentOut);
		// v8 ignore else -- needs a go.mod the replace massaging leaves unchanged
		if (massagedGoMod !== newGoModContent) logger.debug("Removed some relative replace statements and comments from go.mod");
	}
	const goConstraints = await deriveGoToolchainConstraints(config, newGoModContent);
	try {
		await writeLocalFile(goModFileName, massagedGoMod);
		const cmd = "go";
		const env = getEnv();
		const execOptions = {
			cwdFile: goModFileName,
			extraEnv: {
				GOPATH: await ensureCacheDir("go"),
				GOPROXY: env.GOPROXY,
				GOPRIVATE: env.GOPRIVATE,
				GONOPROXY: env.GONOPROXY,
				GONOSUMDB: env.GONOSUMDB,
				GOSUMDB: env.GOSUMDB,
				GOINSECURE: env.GOINSECURE,
				/* v8 ignore next -- TODO: add test */
				GOFLAGS: useModcacherw(goConstraints) ? "-modcacherw" : null,
				CGO_ENABLED: GlobalConfig.get("binarySource") === "docker" ? "0" : null
			},
			docker: {},
			toolConstraints: [{
				toolName: "golang",
				constraint: goConstraints
			}]
		};
		const execCommands = [];
		let goGetDirs;
		if (config.goGetDirs) {
			goGetDirs = config.goGetDirs.filter((dir) => {
				const isValid = isValidLocalPath(dir);
				if (!isValid) logger.warn({ dir }, "Invalid path in goGetDirs");
				return isValid;
			}).map(quote).join(" ");
			if (goGetDirs === "") throw new Error("Invalid goGetDirs");
		}
		let args = `get${modFileFlag} `;
		if (goConstraints && !semver.intersects(goConstraints, `>=1.18`)) args += `-d `;
		args += `-t ${goGetDirs ?? "./..."}`;
		logger.trace({
			cmd,
			args
		}, "go get command included");
		execCommands.push(`${cmd} ${args}`);
		const isImportPathUpdateRequired = config.postUpdateOptions?.includes("gomodUpdateImportPaths") && config.updateType === "major";
		if (isImportPathUpdateRequired) {
			const updateImportCmds = await getUpdateImportPathCmds(updatedDeps, config);
			if (updateImportCmds.length > 0) {
				logger.debug(updateImportCmds, "update import path commands included");
				execCommands.push(...updateImportCmds);
			}
		}
		const mustSkipGoModTidy = !config.postUpdateOptions?.includes("gomodUpdateImportPaths") && config.updateType === "major";
		if (mustSkipGoModTidy) logger.debug("go mod tidy command skipped");
		let tidyOpts = "";
		if (config.postUpdateOptions?.includes("gomodTidy1.17")) tidyOpts += " -compat=1.17";
		if (config.postUpdateOptions?.includes("gomodTidyE")) tidyOpts += " -e";
		const isGoModTidyAllRequired = config.postUpdateOptions?.includes("gomodTidyAll") === true;
		const isGoModTidyRequired = !mustSkipGoModTidy && (config.postUpdateOptions?.includes("gomodTidy") === true || config.postUpdateOptions?.includes("gomodTidy1.17") === true || config.postUpdateOptions?.includes("gomodTidyE") === true || isGoModTidyAllRequired || config.updateType === "major" && isImportPathUpdateRequired);
		if (isGoModTidyRequired) {
			args = `mod tidy${modFileFlag}${tidyOpts}`;
			logger.debug("go mod tidy command included");
			execCommands.push(`${cmd} ${args}`);
		}
		let goWorkSumFileName = upath.join(goModDir, "go.work.sum");
		if (useVendor) {
			const goWorkFile = await findLocalSiblingOrParent(goModFileName, "go.work");
			if (goWorkFile) {
				goWorkSumFileName = upath.join(upath.dirname(goWorkFile), "go.work.sum");
				args = "work vendor";
				logger.debug("using go work vendor");
				execCommands.push(`${cmd} ${args}`);
				args = "work sync";
				logger.debug("using go work sync");
				execCommands.push(`${cmd} ${args}`);
			} else {
				args = `mod vendor${modFileFlag}`;
				logger.debug("using go mod vendor");
				execCommands.push(`${cmd} ${args}`);
			}
			if (isGoModTidyRequired) {
				args = `mod tidy${modFileFlag}${tidyOpts}`;
				logger.debug("go mod tidy command included");
				execCommands.push(`${cmd} ${args}`);
			}
		}
		if (isGoModTidyRequired) {
			args = `mod tidy${modFileFlag}${tidyOpts}`;
			logger.debug("go mod tidy command included");
			execCommands.push(`${cmd} ${args}`);
		}
		let dependentModules = [];
		if (isGoModTidyAllRequired) try {
			dependentModules = await getGoModulesInTidyOrder(goModFileName);
			for (const dependent of dependentModules) {
				const dir = upath.relative(goModDir, upath.dirname(dependent));
				execCommands.push(`${cmd} -C ${quote(dir)} mod tidy${tidyOpts}`);
			}
			logger.debug({ dependentModules }, "go mod tidy commands included");
		} catch (err) {
			logger.warn({ err }, "Failed to find dependent Go modules");
		}
		if (useGoGenerate) {
			if (goGenerateAllowed) {
				logger.debug("go generate command included");
				execCommands.push(`${cmd} generate ./...`);
			} else logger.once.warn(`go generate command requested as a post update action, but goGenerate is not permitted in the allowedUnsafeExecutions`);
		}
		await gitExec(execCommands, execOptions);
		const status = await getRepoStatus();
		const dependentFiles = dependentModules.flatMap((f) => [f, f.replace(regEx(/\.mod$/), ".sum")]);
		if (!status.modified.includes(sumFileName) && !status.modified.includes(goModFileName) && !status.modified.includes(goWorkSumFileName) && !dependentFiles.some((f) => status.modified.includes(f))) return null;
		const res = [];
		if (status.modified.includes(sumFileName)) {
			logger.debug("Returning updated go.sum");
			res.push(fileAddition(sumFileName, await readLocalFile(sumFileName)));
		}
		if (status.modified.includes(goWorkSumFileName)) {
			logger.debug("Returning updated go.work.sum");
			res.push(fileAddition(goWorkSumFileName, await readLocalFile(goWorkSumFileName)));
		}
		for (const f of dependentFiles) if (status.modified.includes(f)) {
			logger.trace(`Returning updated ${f}`);
			res.push(fileAddition(f, await readLocalFile(f)));
		}
		if (isImportPathUpdateRequired) {
			logger.debug("Returning updated go source files for import path changes");
			for (const f of status.modified) if (f.endsWith(".go")) res.push(fileAddition(f, await readLocalFile(f)));
		}
		const alreadyAdded = /* @__PURE__ */ new Set();
		const alreadyDeleted = /* @__PURE__ */ new Set();
		if (useVendor) {
			const vendorChanges = await collectFileChanges(status, { filter: (f) => !!vendorDir && f.startsWith(vendorDir) });
			for (const change of vendorChanges) if (change.type === "addition") alreadyAdded.add(change.path);
			else alreadyDeleted.add(change.path);
			res.push(...fileChangesToArtifactResults(vendorChanges));
		}
		const finalGoModContent = (await readLocalFile(goModFileName, "utf8")).replace(regEx(/\/\/ renovate-replace /g), "").replace(regEx(/renovate-replace-bracket/g), ")");
		if (finalGoModContent !== newGoModContent) {
			const artifactResult = { file: {
				type: "addition",
				path: goModFileName,
				contents: finalGoModContent
			} };
			const updatedDepNames = filterMap(updatedDeps, (dep) => dep?.depName);
			const extraDepsNotice = getExtraDepsNotice(newGoModContent, finalGoModContent, updatedDepNames, config);
			if (extraDepsNotice) artifactResult.notice = {
				file: goModFileName,
				message: extraDepsNotice
			};
			logger.debug("Found updated go.mod after go.sum update");
			res.push(artifactResult);
			alreadyAdded.add(goModFileName);
		}
		if (useGoGenerate && goGenerateAllowed) {
			logger.debug("Updating all modified files since generated files were added");
			res.push(...fileChangesToArtifactResults([...await collectFileChanges(status, {
				include: ["modified", "created"],
				filter: (f) => !alreadyAdded.has(f)
			}), ...await collectFileChanges(status, {
				include: ["deleted"],
				filter: (f) => !alreadyDeleted.has(f)
			})]));
		}
		return res;
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to update go.sum");
		return artifactErrorResult(sumFileName, err);
	}
}
function getGoConstraints(content) {
	const toolchainVer = regEx(/^toolchain\s*go(?<gover>\d+\.\d+\.\d+)$/m).exec(content)?.groups?.gover;
	if (toolchainVer) {
		logger.debug(`Using go version ${toolchainVer} found in toolchain directive`);
		return toolchainVer;
	}
	const goFullVersion = regEx(/^go\s*(?<gover>\d+\.\d+\.\d+)$/m).exec(content)?.groups?.gover;
	if (goFullVersion) return goFullVersion;
	const match = regEx(/^go\s*(?<gover>\d+\.\d+)$/m).exec(content);
	if (!match?.groups?.gover) return;
	return `^${match.groups.gover}`;
}
/**
* Derive the version of the Go toolchain needed to run this project.
*
* This matches with the `golang` Containerbase tool.
*
* In precedence order:
*
* 1. config: \`constraints.go\`
* 1. \`go.mod\`: \`toolchain\` directive
* 1. \`go.mod\`: \`go\` directive
* 1. the \`go\` constraint collected during extraction
*
* NOTE that the \`constraints.golang\` is not used (TODO #42601)
*/
async function deriveGoToolchainConstraints(config, newGoModContent) {
	return await resolveToolConstraint(config, "go", () => getGoConstraints(newGoModContent));
}
//#endregion
export { deriveGoToolchainConstraints, updateArtifacts };

//# sourceMappingURL=artifacts.js.map