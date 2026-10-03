import "../../../constants/error-messages.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureCacheDir, getSiblingFileName, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileAddition, fileChangesToArtifactResults } from "../util.js";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/cocoapods/artifacts.ts
const pluginRegex = regEx(`^\\s*plugin\\s*(['"])(?<plugin>[^'"]+)(['"])`);
function getPluginCommands(content) {
	const result = /* @__PURE__ */ new Set();
	content.split(newlineRegex).forEach((line) => {
		const match = pluginRegex.exec(line);
		if (match?.groups) {
			const { plugin } = match.groups;
			result.add(`gem install ${quote(plugin)}`);
		}
	});
	return [...result];
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent }) {
	logger.debug(`cocoapods.getArtifacts(${packageFileName})`);
	if (updatedDeps.length < 1) {
		logger.debug("CocoaPods: empty update - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "Podfile.lock");
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
	} catch (err) {
		logger.warn({ err }, "Podfile could not be written");
		return artifactErrorResult(lockFileName, err);
	}
	const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent) {
		logger.debug(`Lockfile not found: ${lockFileName}`);
		return null;
	}
	const cocoapods = regEx(/^COCOAPODS: (?<cocoapodsVersion>.*)$/m).exec(existingLockFileContent)?.groups?.cocoapodsVersion ?? null;
	const cmd = [...getPluginCommands(newPackageFileContent), "pod install"];
	const execOptions = {
		cwdFile: packageFileName,
		extraEnv: { CP_HOME_DIR: await ensureCacheDir("cocoapods") },
		docker: {},
		toolConstraints: [{ toolName: "ruby" }, {
			toolName: "cocoapods",
			constraint: cocoapods
		}]
	};
	try {
		await exec(cmd, execOptions);
	} catch (err) {
		/* v8 ignore if -- defensive rethrow, not reproduced in the cocoapods specs */
		if (err.message === "temporary-error") throw err;
		return artifactErrorResult(lockFileName, err);
	}
	const status = await getRepoStatus();
	if (!status.modified.includes(lockFileName)) return null;
	logger.debug(`Returning updated lockfile: ${lockFileName}`);
	const lockFileContent = await readLocalFile(lockFileName);
	const res = [fileAddition(lockFileName, lockFileContent)];
	const podsDir = upath.join(upath.dirname(packageFileName), "Pods");
	const podsManifestFileName = upath.join(podsDir, "Manifest.lock");
	if (await readLocalFile(podsManifestFileName, "utf8")) res.push(...fileChangesToArtifactResults([...await collectFileChanges(status, {
		include: ["modified", "not_added"],
		filter: (f) => f.startsWith(podsDir)
	}), ...await collectFileChanges(status, { include: ["deleted"] })]));
	return res;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map