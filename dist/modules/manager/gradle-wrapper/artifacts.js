import "../../../constants/error-messages.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { replaceAt } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { localPathExists, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { Http } from "../../../util/http/index.js";
import { exec, getToolSettingsOptions, gradleJvmArg } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { resolveToolConstraint } from "../util.js";
import { extraEnv, getJavaConstraint, gradleWrapperFileName, prepareGradleCommand } from "./utils.js";
import { isGradleExecutionAllowed, updateArtifacts as updateArtifacts$1 } from "../gradle/artifacts.js";
import "../gradle/index.js";
import { isTruthy } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
import { lang, query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle-wrapper/artifacts.ts
const http = new Http("gradle-wrapper");
const groovy = lang.createLang("groovy");
async function addIfUpdated(status, fileProjectPath) {
	if (status.modified.includes(fileProjectPath)) return { file: {
		type: "addition",
		path: fileProjectPath,
		contents: await readLocalFile(fileProjectPath)
	} };
	return null;
}
function getDistributionUrl(newPackageFileContent) {
	const distributionUrlLine = newPackageFileContent.split(newlineRegex).find((line) => line.startsWith("distributionUrl="));
	if (distributionUrlLine) return distributionUrlLine.replace("distributionUrl=", "").replace("https\\:", "https:");
	return null;
}
async function getDistributionChecksum(url) {
	const { body } = await http.getText(`${url}.sha256`);
	return body;
}
async function updateBuildFile(localGradleDir, wrapperProperties) {
	let buildFileName = upath.join(localGradleDir, "build.gradle");
	if (!await localPathExists(buildFileName)) buildFileName = upath.join(localGradleDir, "build.gradle.kts");
	const buildFileContent = await readLocalFile(buildFileName, "utf8");
	if (!buildFileContent) {
		logger.debug("build.gradle or build.gradle.kts not found");
		return buildFileName;
	}
	let buildFileUpdated = buildFileContent;
	for (const [propertyName, newValue] of Object.entries(wrapperProperties)) {
		if (!newValue) continue;
		const query$1 = query.tree({
			type: "wrapped-tree",
			maxDepth: 1,
			search: query.sym(propertyName).op("=").str((ctx, { value, offset }) => {
				buildFileUpdated = replaceAt(buildFileUpdated, offset, value, newValue);
				return ctx;
			})
		});
		groovy.query(buildFileUpdated, query$1, []);
	}
	await writeLocalFile(buildFileName, buildFileUpdated);
	return buildFileName;
}
async function updateLockFiles(buildFileName, config) {
	const buildFileContent = await readLocalFile(buildFileName, "utf8");
	if (!buildFileContent) {
		logger.debug("build.gradle or build.gradle.kts not found");
		return null;
	}
	return await updateArtifacts$1({
		packageFileName: buildFileName,
		updatedDeps: [],
		newPackageFileContent: buildFileContent,
		config
	});
}
async function updateArtifacts({ packageFileName, newPackageFileContent, updatedDeps, config }) {
	try {
		logger.debug({ updatedDeps }, "gradle-wrapper.updateArtifacts()");
		const localGradleDir = upath.join(upath.dirname(packageFileName), "../../");
		const gradlewFile = upath.join(localGradleDir, gradleWrapperFileName());
		let cmd = await prepareGradleCommand(gradlewFile);
		if (!cmd) {
			logger.info("No gradlew found - skipping Artifacts update");
			return null;
		}
		if (!isGradleExecutionAllowed(gradlewFile)) {
			logger.trace("Not allowed to execute gradle due to allowedUnsafeExecutions - aborting update");
			return null;
		}
		cmd += gradleJvmArg(getToolSettingsOptions(config.toolSettings));
		cmd += " :wrapper";
		let checksum = null;
		const distributionUrl = getDistributionUrl(newPackageFileContent);
		if (distributionUrl) {
			cmd += ` --gradle-distribution-url ${quote(distributionUrl)}`;
			if (newPackageFileContent.includes("distributionSha256Sum=")) {
				checksum = await getDistributionChecksum(distributionUrl);
				await writeLocalFile(packageFileName, newPackageFileContent.replace(regEx(/distributionSha256Sum=.*/), `distributionSha256Sum=${checksum}`));
				cmd += ` --gradle-distribution-sha256-sum ${quote(checksum)}`;
			}
		} else cmd += ` --gradle-version ${quote(config.newValue)}`;
		logger.debug(`Updating gradle wrapper: "${cmd}"`);
		const execOptions = {
			cwdFile: gradlewFile,
			docker: {},
			extraEnv,
			toolConstraints: [{
				toolName: "java",
				constraint: await resolveToolConstraint(config, "java", () => getJavaConstraint(config.currentValue, gradlewFile))
			}]
		};
		try {
			await exec(cmd, execOptions);
		} catch (err) {
			// istanbul ignore if
			if (err.message === "temporary-error") throw err;
			logger.warn({ err }, "Error executing gradle wrapper update command. This may not necessarily be a blocker to the update, so please verify with the gradle wrapper output logs.");
		}
		const buildFileName = await updateBuildFile(localGradleDir, {
			gradleVersion: config.newValue,
			distributionSha256Sum: checksum,
			distributionUrl
		});
		const lockFiles = await updateLockFiles(buildFileName, config);
		const status = await getRepoStatus();
		const artifactFileNames = [
			packageFileName,
			buildFileName,
			...[
				"gradle/wrapper/gradle-wrapper.jar",
				"gradlew",
				"gradlew.bat"
			].map((filename) => upath.join(localGradleDir, filename))
		];
		const updateArtifactsResult = (await Promise.all(artifactFileNames.map((fileProjectPath) => addIfUpdated(status, fileProjectPath)))).filter(isTruthy);
		if (lockFiles) updateArtifactsResult.push(...lockFiles);
		logger.debug({ files: updateArtifactsResult.map((r) => r.file?.path) }, `Returning updated gradle-wrapper files`);
		return updateArtifactsResult;
	} catch (err) {
		logger.debug({ err }, "Error setting new Gradle Wrapper release value");
		return [{ artifactError: {
			fileName: packageFileName,
			stderr: err.message
		} }];
	}
}
//#endregion
export { updateArtifacts, updateBuildFile, updateLockFiles };

//# sourceMappingURL=artifacts.js.map