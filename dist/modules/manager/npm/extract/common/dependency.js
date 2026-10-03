import { regEx } from "../../../../../util/regex.js";
import { coerceArray } from "../../../../../util/array.js";
import { coerceString } from "../../../../../util/string.js";
import { logger } from "../../../../../logger/index.js";
import { isConstraintName } from "../../../../../util/exec/types.js";
import { api, isValid, isVersion } from "../../../../versioning/npm/index.js";
import { GithubTagsDatasource } from "../../../../datasource/github-tags/index.js";
import { NodeVersionDatasource } from "../../../../datasource/node-version/index.js";
import { NpmDatasource } from "../../../../datasource/npm/index.js";
import { isString } from "@sindresorhus/is";
import validateNpmPackageName from "validate-npm-package-name";
//#region lib/modules/manager/npm/extract/common/dependency.ts
const RE_REPOSITORY_GITHUB_SSH_FORMAT = regEx(/(?:git@)github.com:(?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?$/);
function parseDepName(depType, key) {
	if (depType !== "resolutions") return key;
	const parts = key.split("/");
	const segments = [];
	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i];
		if (part.startsWith("@") && i + 1 < parts.length) {
			i += 1;
			segments.push(`${part}/${parts[i]}`);
		} else segments.push(part);
	}
	const lastSegment = segments.at(-1);
	const [, depName] = coerceArray(regEx(/^(?<depName>(?:@[^/]+\/)?[^@]+)/).exec(coerceString(lastSegment)));
	return depName;
}
function extractDependency(depType, depName, input) {
	const dep = {};
	if (!validateNpmPackageName(depName).validForOldPackages) {
		dep.skipReason = "invalid-name";
		return dep;
	}
	if (!isString(input)) {
		dep.skipReason = "invalid-value";
		return dep;
	}
	dep.currentValue = input.trim();
	if (depType === "engines" || depType === "packageManager") {
		if (depName === "node") dep.datasource = NodeVersionDatasource.id;
		else if (depName === "yarn") {
			dep.datasource = NpmDatasource.id;
			dep.commitMessageTopic = "Yarn";
			const major = isVersion(dep.currentValue) && api.getMajor(dep.currentValue);
			if (major && major > 1) dep.packageName = "@yarnpkg/cli";
		} else if (depName === "npm") {
			dep.datasource = NpmDatasource.id;
			dep.commitMessageTopic = "npm";
		} else if (depName === "pnpm") {
			dep.datasource = NpmDatasource.id;
			dep.commitMessageTopic = "pnpm";
		} else if (depName === "vscode") {
			dep.datasource = GithubTagsDatasource.id;
			dep.packageName = "microsoft/vscode";
			dep.versioning = "npm";
		} else if (depName === "bun") {
			dep.datasource = NpmDatasource.id;
			dep.commitMessageTopic = "Bun";
		} else dep.skipReason = "unknown-engines";
		if (!isValid(dep.currentValue)) dep.skipReason = "unspecified-version";
		return dep;
	}
	if (depType === "volta") {
		if (depName === "node") dep.datasource = NodeVersionDatasource.id;
		else if (depName === "yarn") {
			dep.datasource = NpmDatasource.id;
			dep.commitMessageTopic = "Yarn";
			const major = isVersion(dep.currentValue) && api.getMajor(dep.currentValue);
			if (major && major > 1) dep.packageName = "@yarnpkg/cli";
		} else if (depName === "npm") dep.datasource = NpmDatasource.id;
		else if (depName === "pnpm") {
			dep.datasource = NpmDatasource.id;
			dep.commitMessageTopic = "pnpm";
		} else dep.skipReason = "unknown-volta";
		if (!isValid(dep.currentValue)) dep.skipReason = "unspecified-version";
		return dep;
	}
	if (dep.currentValue.startsWith("npm:")) {
		dep.npmPackageAlias = true;
		const valSplit = dep.currentValue.replace("npm:", "").split("@");
		if (valSplit.length === 1) {
			dep.packageName = depName;
			dep.currentValue = valSplit[0];
		} else if (valSplit.length === 2) {
			dep.packageName = valSplit[0];
			dep.currentValue = valSplit[1];
		} else if (valSplit.length === 3) {
			dep.packageName = `${valSplit[0]}@${valSplit[1]}`;
			dep.currentValue = valSplit[2];
		} else logger.debug(`Invalid npm package alias for dependency: "${depName}":"${dep.currentValue}"`);
	}
	if (dep.currentValue.startsWith("file:")) {
		dep.skipReason = "file";
		return dep;
	}
	if (isValid(dep.currentValue)) {
		dep.datasource = NpmDatasource.id;
		if (dep.currentValue === "") dep.skipReason = "empty";
		return dep;
	}
	const hashSplit = dep.currentValue.split("#");
	if (hashSplit.length !== 2) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	const [depNamePart, depRefPart] = hashSplit;
	let githubOwnerRepo;
	let githubOwner;
	let githubRepo;
	const matchUrlSshFormat = RE_REPOSITORY_GITHUB_SSH_FORMAT.exec(depNamePart);
	if (matchUrlSshFormat === null) {
		githubOwnerRepo = depNamePart.replace(regEx(/^github:/), "").replace(regEx(/^git\+/), "").replace(regEx(/^https:\/\/github\.com\//), "").replace(regEx(/\.git$/), "");
		const githubRepoSplit = githubOwnerRepo.split("/");
		if (githubRepoSplit.length !== 2) {
			dep.skipReason = "unspecified-version";
			return dep;
		}
		[githubOwner, githubRepo] = githubRepoSplit;
	} else {
		githubOwner = matchUrlSshFormat.groups.owner;
		githubRepo = matchUrlSshFormat.groups.repo;
		githubOwnerRepo = `${githubOwner}/${githubRepo}`;
	}
	const githubOwnerRegex = regEx(/^[a-z\d](?:-?[a-z\d]){0,38}$/i);
	const githubRepoRegex = regEx(/^[a-zA-Z0-9._-]{1,100}$/);
	if (githubOwner.length > 39 || !githubOwnerRegex.test(githubOwner) || !githubRepoRegex.test(githubRepo)) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	if (isVersion(depRefPart)) {
		dep.currentRawValue = dep.currentValue;
		dep.currentValue = depRefPart;
		dep.datasource = GithubTagsDatasource.id;
		dep.versioning = "npm";
		dep.packageName = githubOwnerRepo;
		dep.pinDigests = false;
	} else if (regEx(/^[0-9a-f]{7}$/).test(depRefPart) || regEx(/^[0-9a-f]{40}$/).test(depRefPart)) {
		dep.currentRawValue = dep.currentValue;
		dep.currentValue = null;
		dep.currentDigest = depRefPart;
		dep.datasource = GithubTagsDatasource.id;
		dep.versioning = "npm";
		dep.packageName = githubOwnerRepo;
	} else {
		const maybeVersion = depRefPart.substring(7);
		if (depRefPart.startsWith("semver:") && isValid(maybeVersion)) {
			dep.currentRawValue = dep.currentValue;
			dep.currentValue = maybeVersion;
			dep.datasource = GithubTagsDatasource.id;
			dep.versioning = "npm";
			dep.packageName = githubOwnerRepo;
			dep.pinDigests = false;
		} else {
			dep.skipReason = "unversioned-reference";
			return dep;
		}
	}
	dep.sourceUrl = `https://github.com/${githubOwnerRepo}`;
	dep.gitRef = true;
	return dep;
}
function getExtractedConstraints(deps) {
	const extractedConstraints = {};
	const constraints = [
		"bun",
		"node",
		"yarn",
		"npm",
		"pnpm",
		"vscode"
	];
	for (const dep of deps) if (!dep.skipReason && (dep.depType === "engines" || dep.depType === "packageManager") && dep.depName && isConstraintName(dep.depName) && constraints.includes(dep.depName) && isString(dep.currentValue)) extractedConstraints[dep.depName] = dep.currentValue;
	return extractedConstraints;
}
//#endregion
export { extractDependency, getExtractedConstraints, parseDepName };

//# sourceMappingURL=dependency.js.map