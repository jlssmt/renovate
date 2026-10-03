import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getHttpUrl } from "../../../util/git/url.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { CopierAnswersFile } from "./schema.js";
//#region lib/modules/manager/copier/extract.ts
const gitPrefixRegex = regEx(/^git\+/);
const httpProtocolRegex = regEx(/^https?:\/\//);
/**
* Copier supports `git+https://` and `git+ssh://` URL prefixes,
* but git itself does not understand them.
* Strip the `git+` prefix so the URL can be used with git directly.
*/
function stripGitPrefix(url) {
	return url.replace(gitPrefixRegex, "");
}
/**
* Convert SSH-style template URLs to their HTTPS equivalent for the
* datasource lookup, like the git-submodules manager does.
* This way the lookup can be authenticated via `hostRules` on accounts
* which access the Git host over HTTPS only.
* The answers file itself keeps the original URL.
*/
function getPackageName(srcPath) {
	const url = stripGitPrefix(srcPath);
	if (httpProtocolRegex.test(url)) return url;
	try {
		return getHttpUrl(url);
	} catch (err) {
		logger.debug({
			err,
			url
		}, "Failed to convert copier _src_path to an HTTP(S) URL");
		return url;
	}
}
function extractPackageFile(content, packageFile) {
	let parsed;
	try {
		parsed = CopierAnswersFile.parse(content);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, `Parsing Copier answers YAML failed`);
		return null;
	}
	return { deps: [{
		datasource: GitTagsDatasource.id,
		depName: parsed._src_path,
		packageName: getPackageName(parsed._src_path),
		depType: "template",
		currentValue: parsed._commit
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map