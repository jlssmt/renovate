import { get, set } from "../../../../../util/cache/memory/index.js";
import { newlineRegex, regEx } from "../../../../../util/regex.js";
import { coerceString } from "../../../../../util/string.js";
import { logger } from "../../../../../logger/index.js";
import { isHttpUrl } from "../../../../../util/url.js";
import { instrument } from "../../../../../instrumentation/index.js";
import { detectPlatform } from "../../../../../util/common.js";
import { get as get$1, set as set$1 } from "../../../../../util/cache/package/index.js";
import { platform } from "../../../../../modules/platform/index.js";
import { linkify } from "../../../../../util/markdown.js";
import { isDate, isNonEmptyString, isTruthy, isUndefined } from "@sindresorhus/is";
import { DateTime } from "luxon";
import MarkdownIt from "markdown-it";
//#region lib/workers/repository/update/pr/changelog/release-notes.ts
const markdown = new MarkdownIt("zero");
markdown.enable([
	"heading",
	"lheading",
	"fence"
]);
const repositoriesToSkipMdFetching = ["facebook/react-native", "react/react-native"];
const hostQualifiedNameRegex = regEx(/^(?:localhost(?::\d+)?|[^/]+[.:][^/]*)\/(?<unqualifiedName>.+)$/);
async function getReleaseList(project, release, source) {
	logger.trace("getReleaseList()");
	const { apiBaseUrl, repository, type } = project;
	try {
		return await source.getReleaseList(project, release);
	} catch (err) /* istanbul ignore next */ {
		if (err.statusCode === 404) logger.debug({
			repository,
			type,
			apiBaseUrl
		}, "getReleaseList 404");
		else logger.debug({
			repository,
			type,
			apiBaseUrl,
			err
		}, "getReleaseList error");
	}
	return [];
}
function getCachedReleaseList(project, release, source) {
	const { repository, apiBaseUrl } = project;
	const cacheKey = `getReleaseList-${apiBaseUrl}-${repository}`;
	const cachedResult = get(cacheKey);
	// istanbul ignore if
	if (cachedResult !== void 0) return cachedResult;
	const promisedRes = getReleaseList(project, release, source);
	set(cacheKey, promisedRes);
	return promisedRes;
}
function massageBody(input, baseUrl) {
	let body = coerceString(input);
	body = body.replace(regEx(/\r\n/g), "\n");
	body = body.replace(regEx(/^<a name="[^"]*"><\/a>\n/), "");
	body = body.replace(regEx(`^##? \\[[^\\]]*\\]\\(${baseUrl}[^/]*/[^/]*/compare/.*?\\n`, void 0, false), "");
	body = `\n${body}\n`.replace(regEx(`\\n${baseUrl}[^/]+/[^/]+/compare/[^\\n]+(\\n|$)`), "\n");
	body = body.split(regEx(/(?<codeBlock>```[\s\S]*?```)/g)).map((part) => part.startsWith("```") ? part : part.replace(regEx(/\n\s*####? /g), "\n##### ").replace(regEx(/\n\s*## /g), "\n#### ").replace(regEx(/\n\s*# /g), "\n### ")).join("");
	return body.trim();
}
function massageName(input, version) {
	let name = input ?? "";
	if (version) name = name.replace(RegExp(`^(Release )?v?${version}`, "i"), "").trim();
	name = name.trim();
	if (!name.length) return;
	return name;
}
async function getReleaseNotes(project, release, config, source) {
	return await instrument("getReleaseNotes", async () => {
		const { packageName, depName, repository } = project;
		const { version, gitRef } = release;
		logger.trace(`getReleaseNotes(${repository}, ${version}, ${packageName}, ${depName})`);
		const releases = await getCachedReleaseList(project, release, source);
		logger.trace({ releases }, "Release list from getReleaseList");
		let releaseNotes = null;
		let matchedRelease = getExactReleaseMatch(packageName, depName, version, releases);
		if (isUndefined(matchedRelease)) matchedRelease = releases.find((r) => r.tag === version || r.tag === `v${version}` || r.tag === gitRef || r.tag === `v${gitRef}`);
		if (isUndefined(matchedRelease) && config.extractVersion) {
			const extractVersionRegEx = regEx(config.extractVersion);
			matchedRelease = releases.find((r) => {
				const extractedVersion = extractVersionRegEx.exec(r.tag)?.groups?.version;
				return version === extractedVersion;
			});
		}
		releaseNotes = await releaseNotesResult(matchedRelease, project);
		logger.trace({ releaseNotes });
		return releaseNotes;
	});
}
function getExactReleaseMatch(packageName, depName, version, releases) {
	const namePatterns = getNamePatterns(packageName, depName);
	if (!namePatterns.length) return;
	const exactReleaseReg = regEx(`(?:^|/)(?:${namePatterns.join("|")})[@_/-]v?${RegExp.escape(version)}`);
	return releases.filter((r) => r.tag?.endsWith(version)).find((r) => exactReleaseReg.test(r.tag));
}
/**
* A registry host never appears in a Git tag, so a host-qualified name such as
* an OCI chart `<registry>/<org>/<repo>/<chart>` can never match the tag that
* publishes it, which is scoped by the chart name alone: `<chart>-<version>`.
* For those names, also match against the name with its host stripped, and
* against the trailing path segment alone. Names that are not host-qualified,
* such as scoped npm packages, keep matching in full only, so their tag
* prefixes stay as specific as they are today.
*/
function getNamePatterns(packageName, depName) {
	const names = /* @__PURE__ */ new Set();
	for (const name of [packageName, depName]) {
		if (!isNonEmptyString(name)) continue;
		names.add(name);
		const unqualifiedName = hostQualifiedNameRegex.exec(name)?.groups?.unqualifiedName;
		if (isNonEmptyString(unqualifiedName)) {
			names.add(unqualifiedName);
			const trailingName = unqualifiedName.split("/").pop();
			if (isNonEmptyString(trailingName)) names.add(trailingName);
		}
	}
	return [...names].map((name) => RegExp.escape(name));
}
async function releaseNotesResult(releaseMatch, project) {
	if (!releaseMatch) return null;
	const { baseUrl, repository } = project;
	const releaseNotes = releaseMatch;
	if (detectPlatform(baseUrl) === "gitlab") releaseNotes.url = `${baseUrl}${repository}/tags/${releaseMatch.tag}`;
	else
 // v8 ignore next -- a matched release always carries its own url
	releaseNotes.url = releaseMatch.url ? releaseMatch.url : `${baseUrl}${repository}/releases/${releaseMatch.tag}`;
	releaseNotes.body = massageBody(releaseNotes.body, baseUrl);
	releaseNotes.name = massageName(releaseNotes.name, releaseNotes.tag);
	if (releaseNotes.body.length || releaseNotes.name?.length) try {
		if (baseUrl !== "https://gitlab.com/") releaseNotes.body = await linkify(releaseNotes.body, { repository: `${baseUrl}${repository}` });
	} catch (err) /* istanbul ignore next */ {
		logger.warn({
			err,
			baseUrl,
			repository
		}, "Error linkifying");
	}
	else return null;
	return releaseNotes;
}
function sectionize(text, level) {
	const sections = [];
	const lines = text.split(newlineRegex);
	markdown.parse(text, {}).forEach((token) => {
		if (token.type === "heading_open") {
			const lev = +token.tag.substring(1);
			if (lev <= level) sections.push([lev, token.map[0]]);
		}
	});
	sections.push([-1, lines.length]);
	const result = [];
	for (let i = 1; i < sections.length; i += 1) {
		const [lev, start] = sections[i - 1];
		const [, end] = sections[i];
		if (lev === level) result.push(lines.slice(start, end).join("\n"));
	}
	return result;
}
async function getReleaseNotesMdFileInner(project, source) {
	const { repository, type, apiBaseUrl, sourceDirectory } = project;
	try {
		return await source.getReleaseNotesMd(repository, apiBaseUrl, sourceDirectory);
	} catch (err) /* istanbul ignore next */ {
		if (err.statusCode === 404) logger.debug({
			repository,
			type,
			apiBaseUrl
		}, "Error 404 getting changelog md");
		else logger.debug({
			err,
			repository,
			type,
			apiBaseUrl
		}, "Error getting changelog md");
	}
	return null;
}
function getReleaseNotesMdFile(project, source) {
	const { sourceDirectory, repository, apiBaseUrl } = project;
	const cacheKey = sourceDirectory ? `getReleaseNotesMdFile@v2-${repository}-${sourceDirectory}-${apiBaseUrl}` : `getReleaseNotesMdFile@v2-${repository}-${apiBaseUrl}`;
	const cachedResult = get(cacheKey);
	// istanbul ignore if
	if (cachedResult !== void 0) return cachedResult;
	const promisedRes = getReleaseNotesMdFileInner(project, source);
	set(cacheKey, promisedRes);
	return promisedRes;
}
async function getReleaseNotesMd(project, release, source) {
	const { baseUrl, repository, packageName } = project;
	const version = release.version;
	logger.trace(`getReleaseNotesMd(${repository}, ${version})`);
	if (shouldSkipChangelogMd(repository)) return null;
	const changelog = await getReleaseNotesMdFile(project, source);
	if (!changelog) return null;
	const { changelogFile } = changelog;
	const changelogMd = changelog.changelogMd.replace(regEx(/\n\s*<a name="[^"]*">.*?<\/a>\n/g), "\n");
	for (const level of [
		1,
		2,
		3,
		4,
		5,
		6,
		7
	]) {
		const changelogParsed = sectionize(changelogMd, level);
		if (changelogParsed.length >= 2) for (const section of changelogParsed) try {
			const [heading] = section.replace(regEx(/[[\]()]/g), " ").split(newlineRegex);
			const [parenthesizedHeading] = section.split(newlineRegex);
			const title = heading.replace(regEx(/^\s*#*\s*/), "").split(" ").filter(isTruthy);
			const body = section.replace(regEx(/.*?\n(?:-{3,}\n)?/), "").trim();
			const notesSourceUrl = source.getNotesSourceUrl(baseUrl, repository, changelogFile);
			const url = source.getReleaseNotesMdAnchorUrl(notesSourceUrl, parenthesizedHeading);
			for (const word of title) if (word.includes(version) && !isHttpUrl(word)) {
				logger.trace({ body }, `Found release notes for v${version}`);
				return {
					body: await linkifyBody(project, body),
					url,
					notesSourceUrl
				};
			}
			const releasesRegex = regEx(/(?:[0-9]{4}-[0-9]{2}-[0-9]{2})/);
			if (packageName && heading.search(releasesRegex) !== -1) {
				const linkRefDefRegex = regEx(/^\s*\[[^\]]+\]:\s*\S+/);
				if (body.split("\n").some((line) => line.includes(packageName) && line.includes(version) && !isHttpUrl(line) && !linkRefDefRegex.test(line))) {
					logger.trace({ body }, `Found release notes for v${version}`);
					return {
						body: await linkifyBody(project, body),
						url,
						notesSourceUrl
					};
				}
			}
		} catch (err) /* istanbul ignore next */ {
			logger.warn({
				file: changelogFile,
				err
			}, `Error parsing changelog file`);
		}
		logger.trace({ repository }, `No level ${level} changelogs headings found`);
	}
	logger.trace({
		repository,
		version
	}, `No entry found in ${changelogFile}`);
	return null;
}
/**
* Determine how long to cache release notes based on when the version was released.
*
* It's not uncommon for release notes to be updated shortly after the release itself,
* so only cache for about an hour when the release is less than a week old. Otherwise,
* cache for days.
*/
function releaseNotesCacheMinutes(releaseDate) {
	const dt = isDate(releaseDate) ? DateTime.fromJSDate(releaseDate) : DateTime.fromISO(releaseDate);
	const now = DateTime.local();
	if (!dt.isValid || now.diff(dt, "days").days < 7) return 55;
	if (now.diff(dt, "months").months < 6) return 1435;
	return 14495;
}
async function addReleaseNotes(input, config, source) {
	return await instrument(`addReleaseNotes`, async () => {
		if (!input?.versions || !input.project?.type) {
			logger.debug("Missing project or versions");
			return input ?? null;
		}
		const output = {
			...input,
			versions: [],
			hasReleaseNotes: false
		};
		const { repository, sourceDirectory, type: projectType } = input.project;
		const cacheNamespace = `changelog-${projectType}-notes@v2`;
		const cacheKeyPrefix = sourceDirectory ? `${repository}:${sourceDirectory}` : `${repository}`;
		const shouldTruncateToPlatformLimit = config.fetchChangeLogs === "pr";
		const maxBodyLength = shouldTruncateToPlatformLimit ? platform.maxBodyLength() : 0;
		let fetchedNotesLength = 0;
		for (const v of input.versions) {
			let releaseNotes;
			if (!shouldTruncateToPlatformLimit || fetchedNotesLength < maxBodyLength) {
				const gitRefCachePart = v.gitRef ? `:${v.gitRef}` : "";
				const cacheKey = `${cacheKeyPrefix}:${v.version}${gitRefCachePart}`;
				releaseNotes = await get$1(cacheNamespace, cacheKey);
				releaseNotes ??= await getReleaseNotesMd(input.project, v, source);
				releaseNotes ??= await getReleaseNotes(input.project, v, config, source);
				if (!releaseNotes && v.compare.url) releaseNotes = {
					url: v.compare.url,
					notesSourceUrl: ""
				};
				const cacheMinutes = releaseNotesCacheMinutes(v.date);
				await set$1(cacheNamespace, cacheKey, releaseNotes, cacheMinutes);
				if (shouldTruncateToPlatformLimit) {
					fetchedNotesLength += releaseNotes?.body?.length ?? 0;
					if (fetchedNotesLength >= maxBodyLength) logger.debug({
						repository,
						project: input.project,
						skippingVersionFrom: v.version,
						maxBodyLength
					}, `Already fetched enough changelogs to hit the platform PR body limit, skipping version ${v.version} and below`);
				}
			} else if (v.compare.url) releaseNotes = {
				url: v.compare.url,
				notesSourceUrl: ""
			};
			output.versions.push({
				...v,
				releaseNotes
			});
			if (releaseNotes) output.hasReleaseNotes = true;
		}
		return output;
	});
}
/**
* Skip fetching changelog/release-notes markdown files.
* Will force a fallback to using GitHub release notes
*/
function shouldSkipChangelogMd(repository) {
	return repositoriesToSkipMdFetching.includes(repository);
}
async function linkifyBody({ baseUrl, repository }, bodyStr) {
	const body = massageBody(bodyStr, baseUrl);
	if (body?.length) try {
		return await linkify(body, { repository: `${baseUrl}${repository}` });
	} catch (err) /* istanbul ignore next */ {
		logger.warn({
			body,
			err
		}, "linkify error");
	}
	return body;
}
//#endregion
export { addReleaseNotes, getCachedReleaseList, getReleaseList, getReleaseNotes, getReleaseNotesMd, getReleaseNotesMdFile, getReleaseNotesMdFileInner, massageBody, massageName, releaseNotesCacheMinutes, shouldSkipChangelogMd };

//# sourceMappingURL=release-notes.js.map