import { regEx } from "../../../../util/regex.js";
import { parseUrl } from "../../../../util/url.js";
import { GithubReleasesDatasource } from "../../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../../datasource/github-tags/index.js";
import { GitlabReleasesDatasource } from "../../../datasource/gitlab-releases/index.js";
import { GitlabTagsDatasource } from "../../../datasource/gitlab-tags/index.js";
import { isString, isTruthy } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel/rules/http.ts
const archiveSuffixRegex = regEx(`(?:${[
	".zip",
	".tar",
	".jar",
	".war",
	".aar",
	".ar",
	".deb",
	".gz",
	".tar.gz",
	".tgz",
	".bz2",
	".tar.bz2",
	".tbz2",
	".xz",
	".tar.xz",
	".txz",
	".zst",
	".tar.zst",
	".tzst"
].map((archive) => RegExp.escape(archive)).join("|")})$`);
function stripArchiveSuffix(value) {
	return value.replace(archiveSuffixRegex, "");
}
function isHash(value) {
	return isString(value) && regEx(/[0-9a-z]{40}/i).test(value);
}
function parseGithubPath(pathname) {
	const [p0, p1, p2, p3, p4, p5] = pathname.split("/").slice(1);
	const packageName = `${p0}/${p1}`;
	let datasource = "";
	let value = null;
	if (p2 === "releases" && p3 === "download") {
		datasource = GithubReleasesDatasource.id;
		value = p4;
	} else if (p2 === "archive" && p3 === "refs" && p4 === "tags") {
		datasource = GithubTagsDatasource.id;
		value = p5;
	} else if (p2 === "archive") {
		datasource = GithubTagsDatasource.id;
		value = p3;
	}
	if (!value) return null;
	value = stripArchiveSuffix(value);
	return isHash(value) ? {
		datasource,
		packageName,
		currentDigest: value
	} : {
		datasource,
		packageName,
		currentValue: value
	};
}
function parseGitlabPath(pathname) {
	const [p0, p1, p2, p3, p4] = pathname.split("/").slice(1);
	const packageName = `${p0}/${p1}`;
	if (p2 === "-" && p3 === "archive" && p4) return isHash(p4) ? {
		datasource: GitlabTagsDatasource.id,
		packageName,
		currentDigest: p4
	} : {
		datasource: GitlabReleasesDatasource.id,
		packageName,
		currentValue: p4
	};
	return null;
}
function parseArchiveUrl(urlString) {
	if (!urlString) return null;
	const url = parseUrl(urlString);
	if (url?.host === "github.com") return parseGithubPath(url.pathname);
	if (url?.host === "gitlab.com") return parseGitlabPath(url.pathname);
	return null;
}
const httpRules = [
	"http_archive",
	"_http_archive",
	"http_file",
	"_http_file"
];
const HttpTarget = z.object({
	rule: z.enum(httpRules),
	name: z.string(),
	url: z.string().optional(),
	urls: z.array(z.string()).optional(),
	sha256: z.string()
}).refine(({ url, urls }) => !!url || !!urls).transform(({ rule, name, url, urls = [] }) => {
	const parsedUrl = [url, ...urls].map(parseArchiveUrl).find(isTruthy);
	if (!parsedUrl) return [];
	const dep = {
		datasource: parsedUrl.datasource,
		depType: rule,
		depName: name,
		packageName: parsedUrl.packageName
	};
	if (parsedUrl.currentValue) dep.currentValue = parsedUrl.currentValue;
	else if (parsedUrl.currentDigest) dep.currentDigest = parsedUrl.currentDigest;
	return [dep];
});
//#endregion
export { HttpTarget, httpRules, parseArchiveUrl, parseGithubPath };

//# sourceMappingURL=http.js.map