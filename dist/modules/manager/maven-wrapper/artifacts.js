import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { hashStream } from "../../../util/hash.js";
import { chmodLocalFile, deleteLocalFile, readLocalFile, statLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/maven/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Http } from "../../../util/http/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { resolveToolConstraint } from "../util.js";
import { isTruthy } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
import os from "node:os";
//#region lib/modules/manager/maven-wrapper/artifacts.ts
const http = new Http("maven-wrapper");
const DEFAULT_MAVEN_REPO_URL = "https://repo.maven.apache.org/maven2";
function getChecksumFromUrl(url) {
	return withCache({
		namespace: "url-sha256",
		key: url,
		ttlMinutes: 4320
	}, () => hashStream(http.stream(url), "sha256"));
}
function getDistributionUrl(content) {
	return regEx(/^distributionUrl\s*=\s*(?<distributionUrl>.+)$/m).exec(content)?.groups?.distributionUrl?.replace(regEx(/\\:/g), ":").trim() ?? null;
}
function getWrapperUrl(content) {
	return regEx(/^wrapperUrl\s*=\s*(?<wrapperUrl>.+)$/m).exec(content)?.groups?.wrapperUrl?.replace(regEx(/\\:/g), ":").trim() ?? null;
}
function constructWrapperUrl(version, repoUrl = DEFAULT_MAVEN_REPO_URL) {
	return `${repoUrl}/org/apache/maven/wrapper/maven-wrapper/${version}/maven-wrapper-${version}.jar`;
}
function getWrapperVersion(content) {
	return regEx(/^wrapperVersion\s*=\s*(?<wrapperVersion>.+)$/m).exec(content)?.groups?.wrapperVersion?.trim() ?? null;
}
function getDistributionType(content) {
	return regEx(/^distributionType\s*=\s*(?<distributionType>.+)$/m).exec(content)?.groups?.distributionType?.trim() ?? null;
}
function getChecksumValue(content, key) {
	return regEx(`^${key}\\s*=\\s*(?<value>.+)$`, "m").exec(content)?.groups?.value?.trim() ?? null;
}
function addChecksumAfterLine(content, lineRegex, key, value) {
	return content.replace(regEx(lineRegex), (lineMatch) => `${lineMatch}\n${key}=${value}`);
}
async function updateChecksums(content, updatedDeps, addDistributionChecksum, addWrapperChecksum, originalContent) {
	let updatedContent = content;
	if (addDistributionChecksum) {
		const existingChecksum = getChecksumValue(updatedContent, "distributionSha256Sum");
		const fallbackChecksum = getChecksumValue(originalContent, "distributionSha256Sum");
		const distUrl = getDistributionUrl(updatedContent);
		if (distUrl) try {
			const checksum = await getChecksumFromUrl(distUrl);
			if (existingChecksum) updatedContent = updatedContent.replace(regEx(/distributionSha256Sum=.*/), `distributionSha256Sum=${checksum}`);
			else updatedContent = addChecksumAfterLine(updatedContent, regEx(/^(?:distributionUrl\s*=\s*.+)$/m), "distributionSha256Sum", checksum);
		} catch (err) {
			logger.warn({
				err,
				url: distUrl
			}, "Failed to fetch distribution checksum");
			if (!existingChecksum && fallbackChecksum) updatedContent = addChecksumAfterLine(updatedContent, regEx(/^(?:distributionUrl\s*=\s*.+)$/m), "distributionSha256Sum", fallbackChecksum);
		}
	}
	if (addWrapperChecksum) {
		const existingChecksum = getChecksumValue(updatedContent, "wrapperSha256Sum");
		const fallbackChecksum = getChecksumValue(originalContent, "wrapperSha256Sum");
		let wrapperUrl = getWrapperUrl(updatedContent);
		if (!wrapperUrl) {
			const wrapperVersion = getWrapperVersion(updatedContent);
			if (wrapperVersion) wrapperUrl = constructWrapperUrl(wrapperVersion, getCustomMavenWrapperRepoUrl(updatedDeps) ?? DEFAULT_MAVEN_REPO_URL);
		}
		if (wrapperUrl) try {
			const checksum = await getChecksumFromUrl(wrapperUrl);
			if (existingChecksum) updatedContent = updatedContent.replace(regEx(/wrapperSha256Sum=.*/), `wrapperSha256Sum=${checksum}`);
			else updatedContent = addChecksumAfterLine(updatedContent, regEx(/^(?:wrapperUrl\s*=\s*.+|wrapperVersion\s*=\s*.+)$/m), "wrapperSha256Sum", checksum);
		} catch (err) {
			logger.warn({
				err,
				url: wrapperUrl
			}, "Failed to fetch wrapper checksum");
			if (!existingChecksum && fallbackChecksum) updatedContent = addChecksumAfterLine(updatedContent, regEx(/^(?:wrapperUrl\s*=\s*.+|wrapperVersion\s*=\s*.+)$/m), "wrapperSha256Sum", fallbackChecksum);
		}
	}
	return updatedContent;
}
async function addIfUpdated(status, fileProjectPath) {
	if (status.modified.includes(fileProjectPath)) return { file: {
		type: "addition",
		path: fileProjectPath,
		contents: await readLocalFile(fileProjectPath)
	} };
	return null;
}
async function updateArtifacts({ packageFileName, newPackageFileContent, updatedDeps, config }) {
	try {
		logger.debug({ updatedDeps }, "maven-wrapper.updateArtifacts()");
		const hasMavenUpdate = updatedDeps.some((dep) => dep.depName === "maven");
		const hasWrapperUpdate = updatedDeps.some((dep) => dep.depName === "maven-wrapper");
		const hadDistributionChecksum = newPackageFileContent.includes("distributionSha256Sum=");
		const hadWrapperChecksum = newPackageFileContent.includes("wrapperSha256Sum=");
		const originalDistributionType = getDistributionType(newPackageFileContent);
		if (!hasWrapperUpdate && !(hasMavenUpdate && hadDistributionChecksum)) {
			logger.debug("No Maven wrapper or distribution checksum updates - skipping Artifacts update");
			return null;
		}
		let cmd = null;
		if (hasWrapperUpdate) {
			cmd = await createWrapperCommand(packageFileName, originalDistributionType);
			if (!cmd) {
				logger.info("No mvnw found - skipping Artifacts update");
				return null;
			}
		}
		if (hasWrapperUpdate && (hadWrapperChecksum || hadDistributionChecksum)) {
			const jarPath = packageFileName.replace("maven-wrapper.properties", "maven-wrapper.jar");
			if (jarPath.endsWith("maven-wrapper.jar")) try {
				await deleteLocalFile(jarPath);
				logger.debug({ jarPath }, "Deleted old maven-wrapper.jar");
			} catch {}
		}
		let contentToWrite = newPackageFileContent;
		if (hasWrapperUpdate && (hadWrapperChecksum || hadDistributionChecksum)) contentToWrite = contentToWrite.replace(regEx(/^distributionSha256Sum=.*\n?/m), "").replace(regEx(/^wrapperSha256Sum=.*\n?/m), "");
		await writeLocalFile(packageFileName, contentToWrite);
		if (hasWrapperUpdate && cmd) {
			const extraEnv = getExtraEnvOptions(updatedDeps);
			await executeWrapperCommand(cmd, config, packageFileName, extraEnv);
		}
		if (hadDistributionChecksum || hadWrapperChecksum) {
			const currentContent = await readLocalFile(packageFileName, "utf8");
			if (currentContent) {
				const contentWithChecksums = await updateChecksums(currentContent, updatedDeps, hadDistributionChecksum, hadWrapperChecksum, newPackageFileContent);
				await writeLocalFile(packageFileName, contentWithChecksums);
			}
		}
		const updateArtifactsResult = (await getUpdatedArtifacts(await getRepoStatus(), [
			".mvn/wrapper/maven-wrapper.properties",
			".mvn/wrapper/maven-wrapper.jar",
			".mvn/wrapper/MavenWrapperDownloader.java",
			"mvnw",
			"mvnw.cmd"
		].map((filename) => packageFileName.replace(".mvn/wrapper/maven-wrapper.properties", "") + filename))).filter(isTruthy);
		logger.debug({ files: updateArtifactsResult.map((r) => r.file?.path) }, `Returning updated maven-wrapper files`);
		return updateArtifactsResult;
	} catch (err) {
		logger.debug({ err }, "Error setting new Maven Wrapper release value");
		return [{ artifactError: {
			fileName: packageFileName,
			stderr: err.message
		} }];
	}
}
async function getUpdatedArtifacts(status, artifactFileNames) {
	const updatedResults = [];
	for (const artifactFileName of artifactFileNames) {
		const updatedResult = await addIfUpdated(status, artifactFileName);
		if (updatedResult !== null) updatedResults.push(updatedResult);
	}
	return updatedResults;
}
/**
* Find compatible java version for maven.
* see https://maven.apache.org/developers/compatibility-plan.html
* @param mavenWrapperVersion current maven version
* @returns A Java semver range
*/
function getJavaConstraint(mavenWrapperVersion) {
	const major = mavenWrapperVersion ? api.getMajor(mavenWrapperVersion) : null;
	if (major && major >= 3) return "^17.0.0";
	return "^8.0.0";
}
async function executeWrapperCommand(cmd, config, packageFileName, extraEnv) {
	logger.debug(`Updating maven wrapper: "${cmd}"`);
	const { wrapperFullyQualifiedPath } = getMavenPaths(packageFileName);
	const execOptions = {
		cwdFile: wrapperFullyQualifiedPath,
		docker: {},
		extraEnv,
		toolConstraints: [{
			toolName: "java",
			constraint: await resolveToolConstraint(config, "java", () => getJavaConstraint(config.currentValue))
		}]
	};
	try {
		await exec(cmd, execOptions);
	} catch (err) {
		logger.error({ err }, "Error executing maven wrapper update command.");
		throw err;
	}
}
function getExtraEnvOptions(deps) {
	const customMavenWrapperUrl = getCustomMavenWrapperRepoUrl(deps);
	if (customMavenWrapperUrl) return { MVNW_REPOURL: customMavenWrapperUrl };
	return {};
}
function getCustomMavenWrapperRepoUrl(deps) {
	const replaceString = deps.find((dep) => dep.depName === "maven-wrapper")?.replaceString;
	if (!replaceString) return null;
	const match = regEx(/^(?<repoUrl>.*?)\/org\/apache\/maven\/wrapper\//).exec(replaceString);
	if (!match) return null;
	return match.groups.repoUrl === DEFAULT_MAVEN_REPO_URL ? null : match.groups.repoUrl;
}
async function createWrapperCommand(packageFileName, distributionType) {
	const { wrapperExecutableFileName, localProjectDir, wrapperFullyQualifiedPath } = getMavenPaths(packageFileName);
	const args = `wrapper:wrapper -Dtype=${quote(distributionType ?? "script")}`;
	return await prepareCommand(wrapperExecutableFileName, localProjectDir, await statLocalFile(wrapperFullyQualifiedPath), args);
}
function mavenWrapperFileName() {
	if (os.platform() === "win32" && GlobalConfig.get("binarySource") !== "docker") return "mvnw.cmd";
	return "./mvnw";
}
function getMavenPaths(packageFileName) {
	const wrapperExecutableFileName = mavenWrapperFileName();
	const localProjectDir = upath.join(upath.dirname(packageFileName), packageFileName.includes("mvnw") ? "." : "../../");
	return {
		wrapperExecutableFileName,
		localProjectDir,
		wrapperFullyQualifiedPath: upath.join(localProjectDir, wrapperExecutableFileName)
	};
}
async function prepareCommand(fileName, cwd, pathFileStats, args) {
	/* v8 ignore next -- hard to test */
	if (pathFileStats?.isFile() === true) {
		if (os.platform() !== "win32" && (pathFileStats.mode & 1) === 0) {
			logger.warn("Maven wrapper is missing the executable bit");
			await chmodLocalFile(upath.join(cwd, fileName), pathFileStats.mode | 73);
		}
		if (args === null) return fileName;
		return `${fileName} ${args}`;
	}
	return null;
}
//#endregion
export { getJavaConstraint, updateArtifacts };

//# sourceMappingURL=artifacts.js.map