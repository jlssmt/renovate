import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { hashStream } from "../../../util/hash.js";
import { get, set } from "../../../util/cache/package/index.js";
import { Http } from "../../../util/http/index.js";
import { map } from "../../../util/promises.js";
import { findCodeFragment, patchCodeAtFragments, updateCode } from "./common.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/bazel/artifacts.ts
const http = new Http("bazel");
function getUrlFragments(rule) {
	const urls = [];
	const urlRecord = rule.children.url;
	if (urlRecord?.type === "string") urls.push(urlRecord);
	const urlsRecord = rule.children.urls;
	if (urlsRecord?.type === "array") {
		for (const urlRecord of urlsRecord.children)
 // v8 ignore else -- type narrowing only
		if (urlRecord.type === "string") urls.push(urlRecord);
	}
	return urls;
}
const urlMassages = {
	"bazel-skylib.": "bazel_skylib-",
	"/bazel-gazelle/releases/download/0": "/bazel-gazelle/releases/download/v0",
	"/bazel-gazelle-0": "/bazel-gazelle-v0",
	"/rules_go/releases/download/0": "/rules_go/releases/download/v0",
	"/rules_go-0": "/rules_go-v0"
};
function massageUrl(url) {
	let result = url;
	for (const [from, to] of Object.entries(urlMassages)) result = result.replace(from, to);
	return result;
}
function migrateUrl(url, upgrade) {
	const newValue = upgrade.newValue?.replace(regEx(/^v/), "");
	if (url.endsWith("/rules_webtesting.tar.gz") && !newValue?.match(regEx(/^0\.[0123]\./))) return url.replace(regEx(/\.tar\.gz$/), `-${newValue}.tar.gz`);
	return url;
}
function replaceAll(input, from, to) {
	return input.split(from).join(to);
}
function replaceValues(content, from, to) {
	// istanbul ignore if
	if (!from || !to || from === to) return content;
	return replaceAll(content, from.replace(regEx(/^v/), ""), to.replace(regEx(/^v/), ""));
}
async function getHashFromUrl(url) {
	const cacheNamespace = "url-sha256";
	const cachedResult = await get(cacheNamespace, url);
	/* istanbul ignore next line */
	if (cachedResult) return cachedResult;
	try {
		const hash = await hashStream(http.stream(url), "sha256");
		await set(cacheNamespace, url, hash, 4320);
		return hash;
	} catch /* istanbul ignore next */ {
		return null;
	}
}
async function getHashFromUrls(urls) {
	const hashes = (await map(urls, (url) => getHashFromUrl(massageUrl(url)))).filter(isTruthy);
	if (!hashes.length) {
		logger.debug({ urls }, "Could not calculate hash for URLs");
		return null;
	}
	// istanbul ignore if
	if (new Set(hashes).size > 1) logger.warn({ urls }, "Found multiple hashes for single def");
	return hashes[0];
}
async function updateArtifacts(updateArtifact) {
	const { packageFileName: path, updatedDeps: upgrades } = updateArtifact;
	const oldContents = updateArtifact.newPackageFileContent;
	let newContents = oldContents;
	const artifactErrors = [];
	for (const upgrade of upgrades) {
		const { managerData } = upgrade;
		const idx = managerData?.idx;
		// v8 ignore else -- only http rules reach updateArtifacts
		if (upgrade.depType === "http_file" || upgrade.depType === "http_archive") {
			const rule = findCodeFragment(newContents, [idx]);
			/* v8 ignore next -- used only for type narrowing */
			if (rule?.type !== "record") continue;
			const urlFragments = getUrlFragments(rule);
			if (!urlFragments?.length) {
				logger.debug(`def: ${rule.value}, urls is empty`);
				continue;
			}
			function updateValues(oldUrl) {
				let url = oldUrl;
				url = replaceValues(url, upgrade.currentValue, upgrade.newValue);
				url = replaceValues(url, upgrade.currentDigest, upgrade.newDigest);
				url = migrateUrl(url, upgrade);
				return url;
			}
			const urls = urlFragments.map(({ value }) => updateValues(value));
			const hash = await getHashFromUrls(urls);
			if (!hash) {
				// v8 ignore else -- the empty case already continued above
				if (urlFragments.length >= 1) artifactErrors.push({
					fileName: path,
					stderr: `Could not calculate sha256 for ${upgrade.depName} at ${upgrade.newValue}. Checked URLs: ${urls.join(", ")}`
				});
				continue;
			}
			newContents = patchCodeAtFragments(newContents, urlFragments, updateValues);
			newContents = updateCode(newContents, [idx, "strip_prefix"], updateValues);
			newContents = updateCode(newContents, [idx, "sha256"], hash);
		}
	}
	if (oldContents === newContents) {
		if (artifactErrors.length) return artifactErrors.map((error) => ({ artifactError: error }));
		return null;
	}
	return [{ file: {
		type: "addition",
		path,
		contents: newContents
	} }];
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map