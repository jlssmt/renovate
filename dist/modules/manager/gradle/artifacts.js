import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { findUpLocal, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec, getToolSettingsOptions, gradleJvmArg } from "../../../util/exec/index.js";
import { getFiles, getRepoStatus } from "../../../util/git/index.js";
import { resolveToolConstraint } from "../util.js";
import { scm } from "../../platform/scm.js";
import { isGradleBuildFile } from "./utils.js";
import { extraEnv, extractGradleVersion, getJavaConstraint, gradleWrapperFileName, prepareGradleCommand } from "../gradle-wrapper/utils.js";
import { isGcvLockFile, isGcvPropsFile } from "./extract/consistent-versions-plugin.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/gradle/artifacts.ts
function isGradleExecutionAllowed(command) {
	if (!GlobalConfig.get("allowedUnsafeExecutions").includes("gradleWrapper")) {
		logger.once.warn({ command }, "Gradle wrapper command was requested to run, but `gradleWrapper` is not permitted in the allowedUnsafeExecutions");
		return false;
	}
	return true;
}
function isLockFile(fileName) {
	return fileName.endsWith(".lockfile") || isGcvLockFile(fileName);
}
async function getUpdatedLockfiles(oldLockFileContentMap) {
	const res = [];
	const status = await getRepoStatus();
	for (const modifiedFile of status.modified) if (isLockFile(modifiedFile) || modifiedFile.endsWith("gradle/verification-metadata.xml")) {
		const newContent = await readLocalFile(modifiedFile, "utf8");
		if (oldLockFileContentMap[modifiedFile] !== newContent) res.push({ file: {
			type: "addition",
			path: modifiedFile,
			contents: newContent
		} });
	}
	return res;
}
async function getSubProjectList(cmd, execOptions) {
	const subprojects = [""];
	const subprojectsRegex = regEx(/^[ \t]*subprojects: \[(?<subprojects>.+)\]/m);
	const subprojectsMatch = (await exec(`${cmd} properties`, execOptions)).stdout.match(subprojectsRegex);
	if (subprojectsMatch?.groups?.subprojects) {
		const projectRegex = regEx(/project '(?<name>.+?)'/g);
		const matches = subprojectsMatch.groups.subprojects.matchAll(projectRegex);
		for (const match of matches) subprojects.push(match.groups.name);
	}
	return subprojects;
}
async function getGradleVersion(gradlewFile) {
	const propertiesFile = upath.join(upath.dirname(gradlewFile), "gradle/wrapper/gradle-wrapper.properties");
	const properties = await readLocalFile(propertiesFile, "utf8");
	const extractResult = extractGradleVersion(properties ?? "");
	return extractResult ? extractResult.version : null;
}
async function buildUpdateVerificationMetadataCmd(verificationMetadataFile, baseCmd) {
	if (!verificationMetadataFile) return null;
	const verificationMetadata = await readLocalFile(verificationMetadataFile);
	const verifiesChecksums = verificationMetadata?.includes("<verify-metadata>true</verify-metadata>");
	const verifiesSignatures = verificationMetadata?.includes("<verify-signatures>true</verify-signatures>");
	const hashTypes = ["sha256", "sha512"].filter((type) => verificationMetadata?.includes(`<${type} `));
	if (verifiesChecksums || hashTypes.length) logger.debug("Dependency metadata verification enabled or checksums present - generating checksums");
	if ((verifiesChecksums || verifiesSignatures) && !hashTypes.length) hashTypes.push("sha256");
	if (verifiesSignatures) {
		logger.debug("Dependency signature verification enabled - generating PGP signatures");
		hashTypes.push("pgp");
	}
	if (!hashTypes.length) return null;
	return `${baseCmd} --write-verification-metadata ${hashTypes.join(",")} dependencies`;
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`gradle.updateArtifacts(${packageFileName})`);
	const fileList = await scm.getFileList();
	const lockFiles = fileList.filter((file) => isLockFile(file));
	const verificationMetadataFile = fileList.find((fileName) => fileName.endsWith("gradle/verification-metadata.xml"));
	if (!lockFiles.length && !verificationMetadataFile) {
		logger.debug("No Gradle dependency lockfiles or verification metadata found - skipping update");
		return null;
	}
	const gradlewName = gradleWrapperFileName();
	const gradlewFile = await findUpLocal(gradlewName, upath.dirname(packageFileName));
	if (!gradlewFile) {
		logger.debug("Found Gradle dependency lockfiles but no gradlew - aborting update");
		return null;
	}
	if (config.isLockFileMaintenance && (!isGradleBuildFile(packageFileName) || upath.dirname(packageFileName) !== upath.dirname(gradlewFile))) {
		logger.trace("No build.gradle(.kts) file or not in root project - skipping lock file maintenance");
		return null;
	}
	if (!isGradleExecutionAllowed(gradlewFile)) {
		logger.trace("Not allowed to execute gradle due to allowedUnsafeExecutions - aborting update");
		return null;
	}
	logger.debug("Updating found Gradle dependency lockfiles");
	try {
		const oldLockFileContentMap = await getFiles(lockFiles);
		await prepareGradleCommand(gradlewFile);
		const baseCmd = `${gradlewName}${gradleJvmArg(getToolSettingsOptions(config.toolSettings))} --console=plain --dependency-verification lenient -q`;
		const execOptions = {
			cwdFile: gradlewFile,
			docker: {},
			extraEnv,
			toolConstraints: [{
				toolName: "java",
				constraint: await resolveToolConstraint(config, "java", async () => getJavaConstraint(await getGradleVersion(gradlewFile), gradlewFile))
			}]
		};
		const cmds = [];
		if (lockFiles.length) {
			let lockfileCmd = `${baseCmd} ${(await getSubProjectList(baseCmd, execOptions)).map((project) => `${project}:dependencies`).map(quote).join(" ")}`;
			if (config.isLockFileMaintenance === true || !updatedDeps.length || isGcvPropsFile(packageFileName)) lockfileCmd += " --write-locks";
			else {
				const updatedDepNames = updatedDeps.map(({ depName, packageName }) => packageName ?? depName).filter(isNonEmptyStringAndNotWhitespace);
				lockfileCmd += ` --update-locks ${updatedDepNames.map(quote).join(",")}`;
			}
			cmds.push(lockfileCmd);
		}
		const updateVerificationMetadataCmd = await buildUpdateVerificationMetadataCmd(verificationMetadataFile, baseCmd);
		if (updateVerificationMetadataCmd) cmds.push(updateVerificationMetadataCmd);
		if (!cmds.length) {
			logger.debug("No lockfile or verification metadata update necessary");
			return null;
		}
		await writeLocalFile(packageFileName, newPackageFileContent);
		await exec(cmds, {
			...execOptions,
			ignoreStdout: true
		});
		const res = await getUpdatedLockfiles(oldLockFileContentMap);
		logger.debug("Returning updated Gradle dependency lockfiles");
		return res.length > 0 ? res : null;
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Error while updating Gradle dependency lockfiles");
		return [{ artifactError: {
			fileName: packageFileName,
			stderr: err.message
		} }];
	}
}
//#endregion
export { isGradleExecutionAllowed, updateArtifacts };

//# sourceMappingURL=artifacts.js.map