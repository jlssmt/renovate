import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { Json, LooseArray, LooseRecord, withDebugMessage } from "../../../util/schema-utils/index.js";
import { api } from "../../versioning/composer/index.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { PackagistDatasource } from "../../datasource/packagist/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/composer/schema.ts
const ComposerRepo = z.object({
	type: z.literal("composer"),
	/**
	* The regUrl is expected to be a base URL. GitLab composer repository installation guide specifies
	* to use a base URL containing packages.json. Composer still works in this scenario by determining
	* whether to add / remove packages.json from the URL.
	*
	* See https://github.com/composer/composer/blob/750a92b4b7aecda0e5b2f9b963f1cb1421900675/src/Composer/Repository/ComposerRepository.php#L815
	*/
	url: z.string().transform((url) => url.replace(regEx(/\/packages\.json$/), ""))
});
const GitRepo = z.object({
	type: z.enum(["vcs", "git"]).transform(() => "git"),
	url: z.string(),
	name: z.string().optional()
});
const PathRepo = z.object({
	type: z.literal("path"),
	url: z.string(),
	name: z.string().optional()
});
const PackageRepo = z.object({ type: z.literal("package") });
const Repo = z.discriminatedUnion("type", [
	ComposerRepo,
	GitRepo,
	PathRepo,
	PackageRepo
]);
z.discriminatedUnion("type", [
	ComposerRepo,
	GitRepo.extend({ name: z.string() }),
	PathRepo.extend({ name: z.string() }),
	PackageRepo
]);
z.object({ type: z.literal("disable-packagist") });
const bitbucketUrlRegex = regEx(/^(?:https:\/\/|git@)bitbucket\.org[/:](?<packageName>[^/]+\/[^/]+?)(?:\.git)?$/);
const ReposRecord = LooseRecord(z.union([Repo, z.literal(false)]), { onError: ({ error: err }) => {
	logger.debug({ err }, "Composer: error parsing repositories object");
} }).transform((repos) => {
	const result = [];
	for (const [name, repo] of Object.entries(repos)) {
		if (repo === false) {
			if (name === "packagist" || name === "packagist.org") result.push({ type: "disable-packagist" });
			continue;
		}
		if (repo.type === "path" || repo.type === "git") {
			result.push({
				name,
				...repo
			});
			continue;
		}
		if (repo.type === "composer") {
			result.push(repo);
			continue;
		}
	}
	return result;
});
const ReposArray = LooseArray(z.union([Repo, z.union([z.object({ packagist: z.literal(false) }), z.object({ "packagist.org": z.literal(false) })]).transform(() => ({ type: "disable-packagist" }))]), { onError: ({ error: err }) => {
	logger.debug({ err }, "Composer: error parsing repositories array");
} }).transform((repos) => {
	const result = [];
	for (let idx = 0; idx < repos.length; idx++) {
		const repo = repos[idx];
		if (repo.type === "path" || repo.type === "git") result.push({
			name: `__${idx}`,
			...repo
		});
		else result.push(repo);
	}
	return result;
});
const Repos = z.union([ReposRecord, ReposArray]).default([]).catch(withDebugMessage([], "Composer: invalid \"repositories\" field")).transform((repos) => {
	let packagist = true;
	const repoUrls = [];
	const gitRepos = {};
	const pathRepos = {};
	for (const repo of repos) if (repo.type === "composer") repoUrls.push(repo.url);
	else if (repo.type === "git") gitRepos[repo.name] = repo;
	else if (repo.type === "path") pathRepos[repo.name] = repo;
	else if (repo.type === "disable-packagist") packagist = false;
	if (packagist && repoUrls.length) repoUrls.push("https://repo.packagist.org");
	return {
		registryUrls: repoUrls.length ? repoUrls : null,
		gitRepos,
		pathRepos
	};
});
const RequireDefs = LooseRecord(z.string().transform((x) => x.trim())).catch({});
const PackageFile = z.object({
	type: z.string().optional(),
	config: z.object({ platform: z.object({ php: z.string() }) }).nullable().catch(null),
	repositories: Repos,
	require: RequireDefs,
	"require-dev": RequireDefs
}).transform(({ type: composerJsonType, config, repositories, require, "require-dev": requireDev }) => ({
	composerJsonType,
	config,
	repositories,
	require,
	requireDev
}));
const LockedPackage = z.object({
	name: z.string(),
	version: z.string()
});
const Lockfile = z.object({
	"plugin-api-version": z.string().optional(),
	packages: LooseArray(LockedPackage).catch([]),
	"packages-dev": LooseArray(LockedPackage).catch([])
}).transform(({ "plugin-api-version": pluginApiVersion, packages, "packages-dev": packagesDev }) => ({
	pluginApiVersion,
	packages,
	packagesDev
}));
const ComposerExtract = z.object({
	content: z.string(),
	fileName: z.string()
}).transform(({ content, fileName }) => {
	const lockfileName = fileName.replace(regEx(/\.json$/), ".lock");
	return {
		file: content,
		lockfileName,
		lockfile: lockfileName
	};
}).pipe(z.object({
	file: Json.pipe(PackageFile),
	lockfileName: z.string(),
	lockfile: z.string().transform((lockfileName) => readLocalFile(lockfileName, "utf8")).pipe(z.union([z.null(), z.string().pipe(Json).pipe(Lockfile).nullable().catch(withDebugMessage(null, "Composer: does not match schema"))]))
})).transform(({ file, lockfile, lockfileName }) => {
	const { composerJsonType, require, requireDev } = file;
	const { registryUrls, gitRepos, pathRepos } = file.repositories;
	const deps = [];
	const profiles = [{
		depType: "require",
		req: require,
		locked: coerceArray(lockfile?.packages)
	}, {
		depType: "require-dev",
		req: requireDev,
		locked: coerceArray(lockfile?.packagesDev)
	}];
	for (const { depType, req, locked } of profiles) for (const [depName, currentValue] of Object.entries(req)) {
		if (depName === "php") {
			deps.push({
				depType,
				depName,
				currentValue,
				datasource: GithubTagsDatasource.id,
				packageName: "containerbase/php-prebuild"
			});
			continue;
		}
		if (pathRepos[depName]) {
			deps.push({
				depType,
				depName,
				currentValue,
				skipReason: "path-dependency"
			});
			continue;
		}
		const dep = {
			depType,
			depName,
			currentValue
		};
		if (!depName.includes("/")) dep.skipReason = "unsupported";
		const lockedDep = locked.find((item) => item.name === depName);
		if (lockedDep && api.isVersion(lockedDep.version)) dep.lockedVersion = lockedDep.version.replace(regEx(/^v/i), "");
		const gitRepo = gitRepos[depName];
		if (gitRepo) {
			const bitbucketMatchGroups = bitbucketUrlRegex.exec(gitRepo.url)?.groups;
			if (bitbucketMatchGroups) {
				dep.datasource = BitbucketTagsDatasource.id;
				dep.packageName = bitbucketMatchGroups.packageName;
				deps.push(dep);
				continue;
			}
			dep.datasource = GitTagsDatasource.id;
			dep.packageName = gitRepo.url;
			deps.push(dep);
			continue;
		}
		dep.datasource = PackagistDatasource.id;
		if (registryUrls) dep.registryUrls = registryUrls;
		deps.push(dep);
	}
	if (!deps.length) return null;
	const res = { deps };
	if (composerJsonType) res.managerData = { composerJsonType };
	if (require.php) res.extractedConstraints = { php: require.php };
	if (lockfile) res.lockFiles = [lockfileName];
	return res;
});
//#endregion
export { ComposerExtract, ComposerRepo, GitRepo, Lockfile, PackageFile, PackageRepo, PathRepo, Repo, Repos, ReposArray, ReposRecord };

//# sourceMappingURL=schema.js.map