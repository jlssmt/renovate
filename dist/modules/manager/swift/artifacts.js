import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { trimTrailingSlash } from "../../../util/url.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/swift/index.js";
import { parseGitUrl } from "../../../util/git/url.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { getDigest } from "../../datasource/index.js";
import { scm } from "../../platform/scm.js";
import { PackageResolvedJson } from "./schema.js";
//#region lib/modules/manager/swift/artifacts.ts
async function findPackageResolvedFiles() {
	return (await scm.getFileList()).filter((f) => f.endsWith("Package.resolved"));
}
function normalizeUrl(url) {
	try {
		const parsed = parseGitUrl(url);
		if (parsed.resource && parsed.full_name) return `${parsed.resource}/${trimTrailingSlash(parsed.full_name)}`.toLowerCase();
	} catch {}
	return url.replace(regEx(/\.git$/), "").replace(regEx(/\/$/), "").toLowerCase();
}
function matchPinForDep(dep, pins) {
	let depUrl;
	if (dep.datasource === GitTagsDatasource.id)
 /* v8 ignore next -- extract always sets depName for a git-tags dep */
	depUrl = dep.depName ?? "";
	else depUrl = `${dep.registryUrls?.[0] ?? "https://github.com"}/${dep.depName}`;
	const normalizedDepUrl = normalizeUrl(depUrl);
	return pins.find((pin) => normalizeUrl(pin.location) === normalizedDepUrl) ?? null;
}
async function resolveCommitSha(dep, newVersion) {
	if (dep.newDigest) return dep.newDigest;
	const datasource = dep.datasource;
	const packageName = dep.packageName ?? dep.depName;
	if (!datasource || !packageName) return null;
	try {
		return await getDigest({
			datasource,
			packageName,
			registryUrls: dep.registryUrls
		}, newVersion);
	} catch (err) {
		logger.debug({
			err,
			packageName,
			newVersion
		}, "swift: failed to resolve commit SHA");
		return null;
	}
}
function updatePinInJson(content, pin, newVersion, newRevision) {
	let updated = content;
	const identityMatch = regEx(`"identity"\\s*:\\s*"${RegExp.escape(pin.identity)}"`).exec(updated);
	/* istanbul ignore if: identity always exists after JSON parse + matchPinForDep */
	if (!identityMatch) return content;
	const blockStart = updated.slice(0, identityMatch.index).lastIndexOf("{");
	/* istanbul ignore if: valid JSON always has enclosing braces */
	if (blockStart === -1) return content;
	let braceDepth = 0;
	let blockEnd = -1;
	for (let i = blockStart; i < updated.length; i++) if (updated[i] === "{") braceDepth++;
	else if (updated[i] === "}") {
		braceDepth--;
		if (braceDepth === 0) {
			blockEnd = i + 1;
			break;
		}
	}
	/* istanbul ignore if: valid JSON always has matching braces */
	if (blockEnd === -1) return content;
	let pinBlock = updated.slice(blockStart, blockEnd);
	const versionPattern = regEx(/(?<prefix>"version"\s*:\s*)"[^"]*"/);
	pinBlock = pinBlock.replace(versionPattern, `$<prefix>"${newVersion}"`);
	if (newRevision) {
		const revisionPattern = regEx(/(?<prefix>"revision"\s*:\s*)"[^"]*"/);
		pinBlock = pinBlock.replace(revisionPattern, `$<prefix>"${newRevision}"`);
	}
	updated = updated.slice(0, blockStart) + pinBlock + updated.slice(blockEnd);
	return updated;
}
async function updateArtifacts({ updatedDeps, config }) {
	if (config.isLockFileMaintenance) {
		logger.debug("swift: lockFileMaintenance is not supported");
		return null;
	}
	if (!updatedDeps.length) {
		logger.debug("swift: no updatedDeps, nothing to do");
		return null;
	}
	const resolvedFiles = await findPackageResolvedFiles();
	if (!resolvedFiles.length) {
		logger.debug("swift: no Package.resolved files found");
		return null;
	}
	const results = [];
	for (const resolvedFile of resolvedFiles) {
		const content = await readLocalFile(resolvedFile, "utf8");
		if (!content) {
			logger.debug({ resolvedFile }, "swift: could not read Package.resolved");
			continue;
		}
		const parseResult = PackageResolvedJson.safeParse(content);
		if (!parseResult.success) {
			logger.debug({
				resolvedFile,
				err: parseResult.error
			}, "swift: could not parse Package.resolved");
			continue;
		}
		const parsed = parseResult.data;
		let updated = content;
		for (const dep of updatedDeps) {
			if (!dep.newValue) continue;
			if (!dep.newVersion) {
				logger.debug({
					depName: dep.depName,
					newVersion: dep.newVersion,
					newValue: dep.newValue
				}, "swift: found a newValue but not a newVersion");
				continue;
			}
			const pin = matchPinForDep(dep, parsed.pins);
			if (!pin) {
				logger.debug({ depName: dep.depName }, "swift: no matching pin found in Package.resolved");
				continue;
			}
			if (dep.currentValue && api.isSingleVersion(dep.currentValue)) {
				const fromVersion = (dep.currentVersion ?? dep.currentValue).replace(regEx(/^v/), "");
				if (pin.state.version !== fromVersion) {
					logger.debug({
						depName: dep.depName,
						pinVersion: pin.state.version,
						currentValue: dep.currentValue
					}, "swift: pin does not match the upgraded-from version; skipping to avoid touching an unrelated pin");
					continue;
				}
			}
			const resolvedVersion = dep.newVersion.replace(regEx(/^v/), "");
			if (pin.state.version === resolvedVersion) {
				logger.debug({
					depName: dep.depName,
					resolvedVersion
				}, "swift: pin already at target version");
				continue;
			}
			const newRevision = await resolveCommitSha(dep, dep.newVersion);
			updated = updatePinInJson(updated, pin, resolvedVersion, newRevision);
		}
		if (updated !== content) results.push({ file: {
			type: "addition",
			path: resolvedFile,
			contents: updated
		} });
	}
	return results.length ? results : null;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map