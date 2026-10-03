import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isVersion } from "../../versioning/ruby/index.js";
//#region lib/modules/manager/bundler/locked-version.ts
const DEP_REGEX = regEx(/\((?<version>.*)\)/);
function stripPlatformSuffix(version, platforms) {
	for (const platform of platforms) if (version.endsWith(`-${platform}`)) return version.slice(0, -platform.length - 1);
	return version;
}
function extractPlatforms(content) {
	const platforms = [];
	let inPlatformsSection = false;
	for (const line of content.split(newlineRegex)) {
		const trimmed = line.trim();
		const indent = line.indexOf(trimmed);
		if (indent === 0 && trimmed === "PLATFORMS") inPlatformsSection = true;
		else if (indent === 0 && trimmed && inPlatformsSection) break;
		else if (indent === 2 && inPlatformsSection && trimmed) platforms.push(trimmed);
	}
	return platforms;
}
function extractLockFileEntries(lockFileContent) {
	const gemLock = /* @__PURE__ */ new Map();
	try {
		const platforms = extractPlatforms(lockFileContent);
		let inGemSection = false;
		for (const line of lockFileContent.split(newlineRegex)) {
			const trimmed = line.trim();
			const indent = line.indexOf(trimmed);
			if (indent === 0 && trimmed === "GEM") inGemSection = true;
			else if (indent === 0 && trimmed && inGemSection) inGemSection = false;
			else if (indent === 4 && inGemSection) {
				const version = line.match(DEP_REGEX)?.groups?.version;
				if (version) {
					const name = line.replace(`(${version})`, "").trim();
					const cleanedVersion = stripPlatformSuffix(version, platforms);
					if (!gemLock.has(name) && isVersion(cleanedVersion)) gemLock.set(name, cleanedVersion);
				}
			}
		}
	} catch (err) {
		logger.warn({ err }, `Failed to parse Bundler lockfile`);
	}
	return gemLock;
}
//#endregion
export { extractLockFileEntries };

//# sourceMappingURL=locked-version.js.map