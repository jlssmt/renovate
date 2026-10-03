import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureCacheDir, readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { resolveToolConstraint } from "../util.js";
import { extrasPattern } from "./extract.js";
import { isNonEmptyArray } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/pip_requirements/artifacts.ts
/**
* Create a RegExp that matches the first dependency pattern for
* the named dependency that is followed by package hashes.
*
* The regular expression defines a single named group `depConstraint`
* that holds the dependency constraint without the hash specifiers.
* The substring matched by this named group will start with the dependency
* name and end with a non-whitespace character.
*
* @param depName the name of the dependency
*/
function dependencyAndHashPattern(depName) {
	const escapedDepName = RegExp.escape(depName);
	return regEx(`^\\s*(?<depConstraint>${escapedDepName}${extrasPattern}\\s*==.*?\\S)\\s+--hash=`, "m");
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`pip_requirements.updateArtifacts(${packageFileName})`);
	if (!isNonEmptyArray(updatedDeps)) {
		logger.debug("No updated pip_requirements deps - returning null");
		return null;
	}
	try {
		const cmd = [];
		const rewrittenContent = newPackageFileContent.replace(regEx(/\\\n/g), "");
		for (const dep of updatedDeps) {
			if (!dep.depName) continue;
			const depAndHashMatch = dependencyAndHashPattern(dep.depName).exec(rewrittenContent);
			if (depAndHashMatch) {
				const depConstraint = depAndHashMatch.groups.depConstraint;
				cmd.push(`hashin ${quote(depConstraint)} -r ${quote(packageFileName)}`);
			}
		}
		if (!cmd.length) {
			logger.debug("No hashin commands to run - returning");
			return null;
		}
		const execOptions = {
			cwdFile: ".",
			docker: {},
			toolConstraints: [{
				toolName: "python",
				constraint: await resolveToolConstraint(config, "python")
			}, {
				toolName: "hashin",
				constraint: await resolveToolConstraint(config, "hashin")
			}],
			extraEnv: { PIP_CACHE_DIR: await ensureCacheDir("pip") }
		};
		await exec(cmd, execOptions);
		const newContent = await readLocalFile(packageFileName, "utf8");
		if (newContent === newPackageFileContent) {
			logger.debug(`${packageFileName} is unchanged`);
			return null;
		}
		logger.debug(`Returning updated ${packageFileName}`);
		return [{ file: {
			type: "addition",
			path: packageFileName,
			contents: newContent
		} }];
	} catch (err) {
		// istanbul ignore if
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, `Failed to update ${packageFileName} file`);
		return [{ artifactError: {
			fileName: packageFileName,
			stderr: `${String(err.stdout)}\n${String(err.stderr)}`
		} }];
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map