import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { chmodLocalFile, localPathExists, readLocalFile, statLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/gradle/index.js";
import { parseJavaToolchainVersion } from "../gradle/parser.js";
import upath from "upath";
import os from "node:os";
//#region lib/modules/manager/gradle-wrapper/utils.ts
const extraEnv = { GRADLE_OPTS: "-Dorg.gradle.parallel=true -Dorg.gradle.configureondemand=true -Dorg.gradle.daemon=false -Dorg.gradle.caching=false" };
function gradleWrapperFileName() {
	if (os.platform() === "win32" && GlobalConfig.get("binarySource") !== "docker") return "gradlew.bat";
	return "./gradlew";
}
async function prepareGradleCommand(gradlewFile) {
	const gradlewStat = await statLocalFile(gradlewFile);
	if (gradlewStat?.isFile() === true) {
		if (os.platform() !== "win32" && (gradlewStat.mode & 1) === 0) {
			logger.debug("Gradle wrapper is missing the executable bit");
			await chmodLocalFile(gradlewFile, gradlewStat.mode | 73);
		}
		return gradleWrapperFileName();
	}
	return null;
}
/**
* Find compatible java version for gradle.
* see https://docs.gradle.org/current/userguide/compatibility.html
* @param gradleVersion current gradle version
* @param gradlewFile path to gradle wrapper
* @returns A Java semver range
*/
async function getJavaConstraint(gradleVersion, gradlewFile) {
	const major = gradleVersion ? api.getMajor(gradleVersion) : null;
	const minor = gradleVersion ? api.getMinor(gradleVersion) : null;
	if (major) {
		if (major > 8 || major === 8 && minor && minor >= 8) {
			const toolChainVersion = await getJvmConfiguration(gradlewFile);
			if (toolChainVersion) return `^${toolChainVersion}.0.0`;
		}
		if (major > 6 || major === 6 && minor && minor >= 7) {
			const languageVersion = await getJavaLanguageVersion(gradlewFile);
			if (languageVersion) return `^${languageVersion}.0.0`;
		}
		if (major > 9 || major === 9 && minor && minor >= 1) return "^25.0.0";
		if (major > 8 || major === 8 && minor && minor >= 5) return "^21.0.0";
		if (major > 7 || major === 7 && minor && minor >= 3) return "^17.0.0";
		if (major === 7) return "^16.0.0";
		if (major > 0 && major < 5) return "^8.0.0";
	}
	return "^11.0.0";
}
/**
* https://docs.gradle.org/current/userguide/gradle_daemon.html#sec:daemon_jvm_criteria
*/
async function getJvmConfiguration(gradlewFile) {
	const daemonJvmFile = upath.join(upath.dirname(gradlewFile), "gradle/gradle-daemon-jvm.properties");
	const daemonJvm = await readLocalFile(daemonJvmFile, "utf8");
	if (daemonJvm) {
		const toolChainMatch = regEx("^(?:toolchainVersion\\s*=\\s*)(?<version>\\d+)$", "m").exec(daemonJvm);
		// v8 ignore else -- needs a daemon-jvm file without a toolchain version
		if (toolChainMatch?.groups) return toolChainMatch.groups.version;
	}
	return null;
}
/**
* https://docs.gradle.org/current/userguide/toolchains.html#sec:consuming
*/
async function getJavaLanguageVersion(gradlewFile) {
	const localGradleDir = upath.dirname(gradlewFile);
	let buildFileName = upath.join(localGradleDir, "build.gradle");
	if (!await localPathExists(buildFileName)) buildFileName = upath.join(localGradleDir, "build.gradle.kts");
	const buildFileContent = await readLocalFile(buildFileName, "utf8");
	if (!buildFileContent) {
		logger.debug("build.gradle or build.gradle.kts not found");
		return null;
	}
	return parseJavaToolchainVersion(buildFileContent);
}
const DISTRIBUTION_URL_REGEX = regEx("^(?:distributionUrl\\s*=\\s*)(?<url>\\S*-(?<version>\\d+\\.\\d+(?:\\.\\d+)?(?:-\\w+)*)-(?<type>bin|all)\\.zip)\\s*$", "m");
function extractGradleVersion(fileContent) {
	const distributionUrlMatch = DISTRIBUTION_URL_REGEX.exec(fileContent);
	if (distributionUrlMatch?.groups) return {
		url: distributionUrlMatch.groups.url,
		version: distributionUrlMatch.groups.version
	};
	logger.debug("Gradle wrapper version and url could not be extracted from properties - skipping update");
	return null;
}
//#endregion
export { extraEnv, extractGradleVersion, getJavaConstraint, getJavaLanguageVersion, getJvmConfiguration, gradleWrapperFileName, prepareGradleCommand };

//# sourceMappingURL=utils.js.map