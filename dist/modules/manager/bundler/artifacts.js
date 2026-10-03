import { BUNDLER_INVALID_CREDENTIALS } from "../../../constants/error-messages.js";
import { get, set } from "../../../util/cache/memory/index.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureCacheDir, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { getBundlerConstraint, getLockFilePath, getRubyConstraint } from "./common.js";
import { findAllAuthenticatable, getAuthenticationHeaderValue } from "./host-rules.js";
import { isNonEmptyStringAndNotWhitespace, isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/bundler/artifacts.ts
const hostConfigVariablePrefix = "BUNDLE_";
function buildBundleHostVariable(hostRule) {
	// istanbul ignore if: doesn't happen in practice
	if (!hostRule.resolvedHost) return {};
	return { [hostConfigVariablePrefix.concat(hostRule.resolvedHost.toUpperCase().split(".").join("__").split("-").join("___"))]: `${getAuthenticationHeaderValue(hostRule)}` };
}
const resolvedPkgRegex = regEx(/(?<pkg>\S+)(?:\s*\([^)]+\)\s*)? was resolved to/);
function getResolvedPackages(input) {
	const lines = input.split(newlineRegex);
	const result = [];
	for (const line of lines) {
		const resolveMatchGroups = line.match(resolvedPkgRegex)?.groups;
		if (resolveMatchGroups) {
			const { pkg } = resolveMatchGroups;
			result.push(pkg);
		}
	}
	return [...new Set(result)];
}
async function updateArtifacts(updateArtifact, recursionLimit = 10) {
	const { packageFileName, updatedDeps, newPackageFileContent, config } = updateArtifact;
	logger.debug(`bundler.updateArtifacts(${packageFileName})`);
	const existingError = get("bundlerArtifactsError");
	// istanbul ignore if
	if (existingError) {
		logger.debug("Aborting Bundler artifacts due to previous failed attempt");
		throw new Error(existingError);
	}
	const lockFileName = await getLockFilePath(packageFileName);
	const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent) {
		logger.debug("No Gemfile.lock found");
		return null;
	}
	const updatedDepNames = updatedDeps.map(({ depName }) => depName).filter(isNonEmptyStringAndNotWhitespace);
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
		const commands = [];
		if (config.isLockFileMaintenance) commands.push("bundler lock --update");
		else {
			if (updatedDeps.map((dep) => dep.depName).includes("bundler")) commands.push("bundler lock --update --bundler");
			for (const [updateType, updateArg] of Object.entries({
				patch: "--patch ",
				minor: "--minor ",
				major: ""
			})) {
				const deps = updatedDeps.filter((dep) => (dep.updateType ?? "major") === updateType).map((dep) => dep.depName).filter(isString).filter((dep) => dep !== "ruby" && dep !== "bundler");
				let additionalArgs = "";
				if (config.postUpdateOptions?.includes("bundlerConservative")) additionalArgs = "--conservative ";
				if (deps.length) {
					const cmd = `bundler lock ${updateArg}${additionalArgs}--update ${deps.map(quote).join(" ")}`;
					commands.push(cmd);
				}
			}
			if (updatedDeps.map((dep) => dep.depName).includes("ruby")) commands.push("bundler lock");
		}
		const bundlerHostRulesVariables = findAllAuthenticatable({ hostType: "rubygems" }).reduce((variables, hostRule) => ({
			...variables,
			...buildBundleHostVariable(hostRule)
		}), {});
		const bundler = await getBundlerConstraint(updateArtifact, existingLockFileContent);
		const preCommands = ["ruby --version"];
		const execOptions = {
			cwdFile: lockFileName,
			extraEnv: {
				...bundlerHostRulesVariables,
				GEM_HOME: await ensureCacheDir("bundler")
			},
			docker: {},
			toolConstraints: [{
				toolName: "ruby",
				constraint: await getRubyConstraint(updateArtifact)
			}, {
				toolName: "bundler",
				constraint: bundler
			}],
			preCommands
		};
		await exec(commands, execOptions);
		if (!(await getRepoStatus()).modified.includes(lockFileName)) return null;
		logger.debug("Returning updated Gemfile.lock");
		return [{ file: {
			type: "addition",
			path: lockFileName,
			contents: await readLocalFile(lockFileName)
		} }];
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		const output = `${String(err.stdout)}\n${String(err.stderr)}`;
		if (err.message.includes("fatal: Could not parse object") || output.includes("but that version could not be found")) return [{ artifactError: {
			fileName: lockFileName,
			stderr: output
		} }];
		if (err.stdout?.includes("Please supply credentials for this source") || err.stderr?.includes("Authentication is required") || err.stderr?.includes("Please make sure you have the correct access rights")) {
			logger.debug({ err }, "Gemfile.lock update failed due to missing credentials - skipping branch");
			set("bundlerArtifactsError", BUNDLER_INVALID_CREDENTIALS);
			throw new Error(BUNDLER_INVALID_CREDENTIALS);
		}
		const resolveMatches = getResolvedPackages(output).filter((depName) => !updatedDepNames.includes(depName));
		if (recursionLimit > 0 && resolveMatches.length && !config.isLockFileMaintenance) {
			logger.debug({
				resolveMatches,
				updatedDeps
			}, "Found new resolve matches - reattempting recursively");
			return updateArtifacts({
				packageFileName,
				updatedDeps: [.../* @__PURE__ */ new Set([...updatedDeps, ...resolveMatches.map((match) => ({ depName: match }))])],
				newPackageFileContent,
				config
			}, recursionLimit - 1);
		}
		logger.info({ err }, "Gemfile.lock update failed due to an unknown reason");
		return [{ artifactError: {
			fileName: lockFileName,
			stderr: `${String(err.stdout)}\n${String(err.stderr)}`
		} }];
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map