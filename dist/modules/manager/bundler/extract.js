import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isHttpUrl } from "../../../util/url.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { RubygemsDatasource } from "../../datasource/rubygems/index.js";
import { delimiters, extractRubyVersion, getLockFilePath } from "./common.js";
import { extractLockFileEntries } from "./locked-version.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/manager/bundler/extract.ts
function formatContent(input) {
	return `${input.replace(regEx(/^ {2}/), "")}\n`;
}
const variableMatchRegex = regEx(`^(?<key>\\w+)\\s*=\\s*['"](?<value>[^'"]+)['"]`);
const gemMatchRegex = regEx(`^\\s*gem\\s+(['"])(?<depName>[^'"]+)(['"])(\\s*,\\s*(?<currentValue>(['"])[^'"]+['"](\\s*,\\s*['"][^'"]+['"])?))?`);
const sourceMatchRegex = regEx(`source:\\s*((?:['"](?<registryUrl>[^'"]+)['"])|(?<sourceName>\\w+))?`);
const gitRefsMatchRegex = regEx(`((git:\\s*['"](?<gitUrl>[^'"]+)['"])|(\\s*,\\s*github:\\s*['"](?<repoName>[^'"]+)['"]))(\\s*,\\s*branch:\\s*['"](?<branchName>[^'"]+)['"])?(\\s*,\\s*ref:\\s*['"](?<refName>[^'"]+)['"])?(\\s*,\\s*tag:\\s*['"](?<tagName>[^'"]+)['"])?`);
const pathMatchRegex = regEx(`path:\\s*['"](?<path>[^'"]+)['"]`);
async function extractPackageFile(content, packageFile) {
	let lineNumber;
	async function processGroupBlock(line, repositoryUrl, trimGroupLine = false) {
		const groupMatch = regEx(/^group\s+(?<groups>.*?)\s+do/).exec(line);
		if (groupMatch) {
			const depTypes = groupMatch.groups.groups.split(",").map((group) => group.trim()).map((group) => group.replace(regEx(/^:/), ""));
			const groupLineNumber = lineNumber;
			let groupContent = "";
			let groupLine = "";
			while (lineNumber < lines.length && (trimGroupLine ? groupLine.trim() !== "end" : groupLine !== "end")) {
				lineNumber += 1;
				groupLine = lines[lineNumber];
				// istanbul ignore if
				if (!isString(groupLine)) {
					logger.debug({
						content,
						packageFile,
						type: "groupLine"
					}, "Bundler parsing error");
					groupLine = "end";
				}
				if (trimGroupLine ? groupLine.trim() !== "end" : groupLine !== "end") groupContent += formatContent(groupLine);
			}
			const groupRes = await extractPackageFile(groupContent);
			if (groupRes) res.deps = res.deps.concat(groupRes.deps.map((dep) => {
				const depObject = {
					...dep,
					depTypes,
					managerData: { lineNumber: (dep.managerData?.lineNumber ?? NaN) + groupLineNumber + 1 }
				};
				if (repositoryUrl) depObject.registryUrls = [repositoryUrl];
				return depObject;
			}));
		}
	}
	const res = {
		registryUrls: [],
		deps: []
	};
	const variables = {};
	const lines = content.split(newlineRegex);
	for (lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
		const line = lines[lineNumber];
		let sourceMatch = null;
		for (const delimiter of delimiters) sourceMatch = sourceMatch ?? regEx(`^source ((${delimiter}(?<registryUrl>[^${delimiter}]+)${delimiter})|(?<sourceName>\\w+))\\s*$`).exec(line);
		if (sourceMatch) {
			if (sourceMatch.groups?.registryUrl) res.registryUrls?.push(sourceMatch.groups.registryUrl);
			if (sourceMatch.groups?.sourceName) {
				const registryUrl = variables[sourceMatch.groups.sourceName];
				if (registryUrl) res.registryUrls?.push(registryUrl);
			}
		}
		const rubyMatch = extractRubyVersion(line);
		if (rubyMatch) res.deps.push({
			depName: "ruby",
			currentValue: rubyMatch,
			datasource: RubyVersionDatasource.id,
			registryUrls: null
		});
		const variableMatch = variableMatchRegex.exec(line);
		if (variableMatch?.groups?.key) variables[variableMatch.groups?.key] = variableMatch.groups?.value;
		const gemMatch = gemMatchRegex.exec(line)?.groups;
		if (gemMatch) {
			const dep = {
				depName: gemMatch.depName,
				managerData: { lineNumber },
				datasource: RubygemsDatasource.id
			};
			if (gemMatch.currentValue) dep.currentValue = gemMatch.currentValue;
			if (pathMatchRegex.exec(line)?.groups) dep.skipReason = "internal-package";
			const sourceMatch = sourceMatchRegex.exec(line)?.groups;
			if (sourceMatch) {
				if (sourceMatch.registryUrl) dep.registryUrls = [sourceMatch.registryUrl];
				else if (sourceMatch.sourceName) dep.registryUrls = [variables[sourceMatch.sourceName]];
			}
			const gitRefsMatch = gitRefsMatchRegex.exec(line)?.groups;
			if (gitRefsMatch) {
				if (gitRefsMatch.gitUrl) {
					const gitUrl = gitRefsMatch.gitUrl;
					dep.packageName = gitUrl;
					if (isHttpUrl(gitUrl)) dep.sourceUrl = gitUrl.replace(regEx(/\.git$/), "");
				} else {
					dep.packageName = `https://github.com/${gitRefsMatch.repoName}`;
					dep.sourceUrl = dep.packageName;
				}
				if (gitRefsMatch.refName) dep.currentDigest = gitRefsMatch.refName;
				else if (gitRefsMatch.branchName) dep.currentValue = gitRefsMatch.branchName;
				else if (gitRefsMatch.tagName) dep.currentValue = gitRefsMatch.tagName;
				dep.datasource = GitRefsDatasource.id;
			}
			res.deps.push(dep);
		}
		await processGroupBlock(line);
		for (const delimiter of delimiters) {
			const sourceBlockMatch = regEx(`^source\\s+((${delimiter}(?<registryUrl>[^${delimiter}]+)${delimiter})|(?<sourceName>\\w+))\\s+do`).exec(line);
			if (sourceBlockMatch) {
				let repositoryUrl = "";
				if (sourceBlockMatch.groups?.registryUrl) repositoryUrl = sourceBlockMatch.groups.registryUrl;
				if (sourceBlockMatch.groups?.sourceName && variables[sourceBlockMatch.groups.sourceName]) repositoryUrl = variables[sourceBlockMatch.groups.sourceName];
				const sourceLineNumber = lineNumber;
				let sourceContent = "";
				let sourceLine = "";
				while (lineNumber < lines.length && sourceLine.trim() !== "end") {
					lineNumber += 1;
					sourceLine = lines[lineNumber];
					// istanbul ignore if
					if (!isString(sourceLine)) {
						logger.debug({
							content,
							packageFile,
							type: "sourceLine"
						}, "Bundler parsing error");
						sourceLine = "end";
					}
					await processGroupBlock(sourceLine.trim(), repositoryUrl, true);
					if (sourceLine.trim() !== "end") sourceContent += formatContent(sourceLine);
				}
				const sourceRes = await extractPackageFile(sourceContent);
				if (sourceRes) res.deps = res.deps.concat(sourceRes.deps.map((dep) => ({
					...dep,
					registryUrls: [repositoryUrl],
					managerData: { lineNumber: (dep.managerData?.lineNumber ?? NaN) + sourceLineNumber + 1 }
				})));
			}
		}
		if (regEx(/^platforms\s+(?:.*?)\s+do/).test(line)) {
			const platformsLineNumber = lineNumber;
			let platformsContent = "";
			let platformsLine = "";
			while (lineNumber < lines.length && platformsLine !== "end") {
				lineNumber += 1;
				platformsLine = lines[lineNumber];
				// istanbul ignore if
				if (!isString(platformsLine)) {
					logger.debug({
						content,
						packageFile,
						type: "platformsLine"
					}, "Bundler parsing error");
					platformsLine = "end";
				}
				if (platformsLine !== "end") platformsContent += formatContent(platformsLine);
			}
			const platformsRes = await extractPackageFile(platformsContent);
			if (platformsRes) res.deps = res.deps.concat(platformsRes.deps.map((dep) => ({
				...dep,
				managerData: { lineNumber: (dep.managerData?.lineNumber ?? NaN) + platformsLineNumber + 1 }
			})));
		}
		if (regEx(/^if\s+(?:.*?)/).test(line)) {
			const ifLineNumber = lineNumber;
			let ifContent = "";
			let ifLine = "";
			while (lineNumber < lines.length && ifLine !== "end") {
				lineNumber += 1;
				ifLine = lines[lineNumber];
				// istanbul ignore if
				if (!isString(ifLine)) {
					logger.debug({
						content,
						packageFile,
						type: "ifLine"
					}, "Bundler parsing error");
					ifLine = "end";
				}
				if (ifLine !== "end") ifContent += formatContent(ifLine);
			}
			const ifRes = await extractPackageFile(ifContent);
			if (ifRes) res.deps = res.deps.concat(ifRes.deps.map((dep) => ({
				...dep,
				managerData: { lineNumber: (dep.managerData?.lineNumber ?? NaN) + ifLineNumber + 1 }
			})));
		}
	}
	if (!res.deps.length && !res.registryUrls?.length) return null;
	if (packageFile) {
		const gemfileLockPath = await getLockFilePath(packageFile);
		const lockContent = await readLocalFile(gemfileLockPath, "utf8");
		if (lockContent) {
			logger.debug(`Found lock file ${gemfileLockPath} for packageFile: ${packageFile}`);
			res.lockFiles = [gemfileLockPath];
			const lockedEntries = extractLockFileEntries(lockContent);
			for (const dep of res.deps) {
				const lockedDepValue = lockedEntries.get(`${dep.depName}`);
				if (lockedDepValue) dep.lockedVersion = lockedDepValue;
			}
		}
	}
	return res;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map