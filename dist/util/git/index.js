import { CONFIG_VALIDATION, INVALID_PATH, REPOSITORY_CHANGED, REPOSITORY_DISABLED, REPOSITORY_EMPTY, SYSTEM_INSUFFICIENT_DISK_SPACE, TEMPORARY_ERROR, UNKNOWN_ERROR } from "../../constants/error-messages.js";
import { coerceObject } from "../object.js";
import { getEnv } from "../env.js";
import { newlineRegex, regEx } from "../regex.js";
import { getConfigFileNames } from "../../config/app-strings.js";
import { GlobalConfig } from "../../config/global.js";
import { coerceArray } from "../array.js";
import { matchRegexOrGlobList } from "../string-match.js";
import { logger } from "../../logger/index.js";
import { instrument } from "../../instrumentation/index.js";
import { getChildEnv } from "../exec/utils.js";
import { formatCommitMessage } from "./commit-trailers.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { logWarningIfUnicodeHiddenCharactersInPackageFile } from "../unicode.js";
import { getCache } from "../cache/repository/index.js";
import { withInstrumenting } from "../../instrumentation/with-instrumenting.js";
import { incCountValue, incLimitedValue } from "../../workers/global/limits.js";
import { toLongCommitSha } from "../schema-utils/git.js";
import { getNoVerify, setNoVerify, simpleGitConfig } from "./config.js";
import { getGitEnvironmentVariables } from "./auth.js";
import { parseGitAuthor } from "./author.js";
import { getCachedBehindBaseResult, setCachedBehindBaseResult } from "./behind-base-branch-cache.js";
import { getCachedConflictResult, setCachedConflictResult } from "./conflicts-cache.js";
import { bulkChangesDisallowed, checkForPlatformFailure, handleCommitError } from "./error.js";
import { instrumentGit } from "./instrument.js";
import { getCachedModifiedResult, setCachedModifiedResult } from "./modified-cache.js";
import { configSigningKey, setPrivateKey, writePrivateKey } from "./private-key.js";
import { GitTreeMode } from "./types.js";
import { getCachedUpdateDateResult, setCachedUpdateDateResult } from "./update-date-cache.js";
import { isBoolean, isNonEmptyObject, isNonEmptyStringAndNotWhitespace, isString, isTruthy } from "@sindresorhus/is";
import fs from "fs-extra";
import { DateTime } from "luxon";
import upath from "upath";
import URL from "node:url";
import semver from "semver";
import { setTimeout } from "node:timers/promises";
import { ResetMode, simpleGit } from "simple-git";
//#region lib/util/git/index.ts
const retryCount = 5;
const delaySeconds = 3;
const delayFactor = 2;
const RENOVATE_FORK_UPSTREAM = "renovate-fork-upstream";
function createSimpleGit({ config, env, authentication } = {}) {
	const childEnv = getChildEnv({
		extraEnv: { GIT_SSH_COMMAND: "ssh -o BatchMode=yes" },
		env: {
			...env,
			LANG: "C.UTF-8",
			LC_ALL: "C.UTF-8"
		}
	});
	const gitEnv = authentication ? getGitEnvironmentVariables(childEnv, authentication.hostTypes) : childEnv;
	return simpleGit({
		...simpleGitConfig(),
		...config
	}).env(gitEnv);
}
async function gitRetry(gitFunc) {
	let round = 0;
	let lastError;
	while (round <= retryCount) {
		if (round > 0) logger.debug(`gitRetry round ${round}`);
		try {
			const res = await gitFunc();
			if (round > 1) logger.debug("Successful retry of git function");
			return res;
		} catch (err) {
			lastError = err;
			logger.debug({ err }, `Git function thrown`);
			const errChecked = checkForPlatformFailure(err);
			if (errChecked instanceof ExternalHostError) logger.debug({ err: errChecked }, `ExternalHostError thrown in round ${round + 1} of ${retryCount} - retrying in the next round`);
			else throw err;
		}
		const nextDelay = delayFactor ^ (round - 1) * delaySeconds;
		logger.trace({ nextDelay }, `Delay next round`);
		await setTimeout(1e3 * nextDelay);
		round++;
	}
	throw lastError;
}
async function isDirectory(dir) {
	try {
		return (await fs.stat(dir)).isDirectory();
	} catch {
		return false;
	}
}
async function getDefaultBranch(git) {
	logger.debug("getDefaultBranch()");
	try {
		let res = await git.raw([
			"rev-parse",
			"--abbrev-ref",
			"origin/HEAD"
		]);
		/* v8 ignore next -- TODO: add test #40625 */
		if (!res) {
			logger.debug("Could not determine default branch using git rev-parse");
			const headPrefix = "HEAD branch: ";
			res = (await git.raw([
				"remote",
				"show",
				"origin"
			])).split("\n").map((line) => line.trim()).find((line) => line.startsWith(headPrefix)).replace(headPrefix, "");
		}
		return res.replace("origin/", "").trim();
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.debug({ err }, "Error getting default branch");
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		if (err.message.startsWith("fatal: ref refs/remotes/origin/HEAD is not a symbolic ref")) throw new Error(REPOSITORY_EMPTY);
		if (err.message.includes("fatal: ambiguous argument 'origin/HEAD'")) {
			logger.warn("Error getting default branch");
			throw new Error(TEMPORARY_ERROR);
		}
		throw err;
	}
}
let config = {};
let git;
let gitInitialized;
let submodulesInitizialized;
let privateKeySet = false;
let platformIgnoredAuthors = [];
const GIT_MINIMUM_VERSION = "2.33.0";
async function validateGitVersion() {
	let version;
	const globalGit = instrumentGit(createSimpleGit());
	try {
		const { major, minor, patch, installed } = await globalGit.version();
		/* v8 ignore if -- TODO: add test #40625 */
		if (!installed) {
			logger.error("Git not installed");
			return false;
		}
		version = `${major}.${minor}.${patch}`;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.error({ err }, "Error fetching git version");
		return false;
	}
	/* v8 ignore if -- TODO: add test #40625 */
	if (!(version && semver.gte(version, "2.33.0"))) {
		logger.error({
			detectedVersion: version,
			minimumVersion: GIT_MINIMUM_VERSION
		}, "Git version needs upgrading");
		return false;
	}
	logger.debug(`Found valid git version: ${version}`);
	return true;
}
async function fetchBranchCommits(preferUpstream = true) {
	config.branchCommits = {};
	const url = preferUpstream && config.upstreamUrl ? config.upstreamUrl : config.url;
	logger.debug(`fetchBranchCommits(): url=${url}`);
	const opts = [
		"ls-remote",
		"--heads",
		url
	];
	const localDir = GlobalConfig.get("localDir");
	const repoExists = await fs.pathExists(upath.join(localDir, ".git/HEAD"));
	if (config.extraCloneOpts && !repoExists) Object.entries(config.extraCloneOpts).forEach((e) => opts.unshift(e[0], `${e[1]}`));
	try {
		const lsRemoteRes = await gitRetry(() => git.raw(opts));
		logger.trace({ lsRemoteRes }, "git ls-remote result");
		lsRemoteRes.split(newlineRegex).filter(isTruthy).map((line) => line.trim().split(regEx(/\s+/))).forEach(([sha, ref]) => {
			config.branchCommits[ref.replace("refs/heads/", "")] = toLongCommitSha(sha);
		});
		if (isNonEmptyObject(config.virtualBranches)) for (const [name, branch] of Object.entries(config.virtualBranches)) config.branchCommits[name] = branch.sha;
		logger.trace({ branchCommits: config.branchCommits }, "branch commits");
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		logger.debug({ err }, "git error");
		if (err.message?.includes("Please ask the owner to check their account")) throw new Error(REPOSITORY_DISABLED);
		throw err;
	}
}
async function fetchRevSpec(...revSpec) {
	await gitRetry(() => git.fetch(["origin", ...revSpec]));
}
async function initRepo(args) {
	config = { ...args };
	config.ignoredAuthors = [];
	config.additionalBranches = [];
	config.branchIsModified = {};
	config.virtualBranches ??= {};
	git = instrumentGit(createSimpleGit({ config: { baseDir: GlobalConfig.get("localDir") } }));
	gitInitialized = false;
	submodulesInitizialized = false;
	await fetchBranchCommits();
}
async function resetToBranch(branchName) {
	logger.debug(`resetToBranch(${branchName})`);
	await git.raw(["reset", "--hard"]);
	await gitRetry(() => git.checkout(branchName));
	await git.raw([
		"reset",
		"--hard",
		`origin/${branchName}`
	]);
	await git.raw(["clean", "-fd"]);
}
/* v8 ignore next -- TODO: add test #40625 */
async function resetToCommit(commit) {
	logger.debug(`resetToCommit(${commit})`);
	await git.raw([
		"reset",
		"--hard",
		commit
	]);
}
async function deleteLocalBranch(branchName) {
	await git.branch(["-D", branchName]);
}
async function cleanLocalBranches() {
	const existingBranches = (await git.raw(["branch"])).split(newlineRegex).map((branch) => branch.trim()).filter((branch) => branch.length > 0 && !branch.startsWith("* "));
	logger.debug({ existingBranches });
	for (const branchName of existingBranches) await deleteLocalBranch(branchName);
}
function setGitAuthor(gitAuthor) {
	const gitAuthorParsed = parseGitAuthor(gitAuthor ?? "Renovate <renovate@whitesourcesoftware.com>");
	if (!gitAuthorParsed) {
		const error = new Error(CONFIG_VALIDATION);
		error.validationSource = "None";
		error.validationError = "Invalid gitAuthor";
		error.validationMessage = `\`gitAuthor\` is not parsed as valid RFC5322 format: \`${gitAuthor}\``;
		throw error;
	}
	config.gitAuthorName = gitAuthorParsed.name;
	config.gitAuthorEmail = gitAuthorParsed.address;
}
async function writeGitAuthor() {
	const { gitAuthorName, gitAuthorEmail, writeGitDone } = config;
	/* v8 ignore if -- TODO: add test #40625 */
	if (writeGitDone) return;
	config.writeGitDone = true;
	try {
		// v8 ignore else -- TODO: add test #40625
		if (gitAuthorName) {
			logger.debug(`Setting git author name: ${gitAuthorName}`);
			await git.addConfig("user.name", gitAuthorName);
		}
		// v8 ignore else -- TODO: add test #40625
		if (gitAuthorEmail) {
			logger.debug(`Setting git author email: ${gitAuthorEmail}`);
			await git.addConfig("user.email", gitAuthorEmail);
		}
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		logger.debug({
			err,
			gitAuthorName,
			gitAuthorEmail
		}, "Error setting git author config");
		throw new Error(TEMPORARY_ERROR);
	}
}
function setUserRepoConfig({ gitIgnoredAuthors, gitAuthor }) {
	config.ignoredAuthors = coerceArray(gitIgnoredAuthors);
	setGitAuthor(gitAuthor);
}
function setPlatformIgnoredAuthors(emails = []) {
	platformIgnoredAuthors = emails;
}
/**
* Clears the in-memory `isBranchModified()` results.
*
* @internal Test helper, so read-only tests can share one `initRepo()`.
*/
function clearBranchIsModifiedCache() {
	config.branchIsModified = {};
}
async function getSubmodules() {
	try {
		return (await git.raw([
			"config",
			"--file",
			".gitmodules",
			"--get-regexp",
			"\\.path"
		]) || "").trim().split(regEx(/[\n\s]/)).filter((_e, i) => i % 2);
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, "Error getting submodules");
		return [];
	}
}
async function cloneSubmodules(shouldClone, cloneSubmodulesFilter) {
	if (!shouldClone || submodulesInitizialized) return;
	submodulesInitizialized = true;
	const gitEnv = getGitEnvironmentVariables(getChildEnv());
	await syncGit();
	const submodules = await getSubmodules();
	for (const submodule of submodules) {
		if (!matchRegexOrGlobList(submodule, cloneSubmodulesFilter ?? ["*"])) {
			logger.debug({ cloneSubmodulesFilter }, `Skipping submodule ${submodule}`);
			continue;
		}
		try {
			logger.debug(`Cloning git submodule at ${submodule}`);
			await gitRetry(() => git.env(gitEnv).submoduleUpdate([
				"--init",
				"--recursive",
				submodule
			]));
		} catch (err) {
			logger.warn({
				err,
				submodule
			}, `Unable to initialise git submodule`);
		}
	}
}
function isCloned() {
	return gitInitialized;
}
async function isFileModeEnabled() {
	if (config.fileModeEnabled === void 0) {
		const value = await git.raw([
			"config",
			"--type=bool",
			"--default=true",
			"--get",
			"core.fileMode"
		]);
		config.fileModeEnabled = value.trim() === "true";
	}
	return config.fileModeEnabled;
}
const syncGit = withInstrumenting({ name: "syncGit" }, async () => {
	if (gitInitialized) {
		if (getEnv().RENOVATE_X_CLEAR_HOOKS) await git.raw([
			"config",
			"core.hooksPath",
			"/dev/null"
		]);
		return;
	}
	/* v8 ignore if -- TODO: add test #40625 */
	if (GlobalConfig.get("platform") === "local") throw new Error("Cannot sync git when platform=local");
	gitInitialized = true;
	const localDir = GlobalConfig.get("localDir");
	logger.debug(`syncGit(): Initializing git repository into ${localDir}`);
	const gitHead = upath.join(localDir, ".git/HEAD");
	let clone = true;
	if (await fs.pathExists(gitHead)) await instrument("fetch", async () => {
		logger.debug(`syncGit(): Found existing git repository, attempting git fetch`);
		try {
			await git.raw([
				"remote",
				"set-url",
				"origin",
				config.url
			]);
			const fetchStart = Date.now();
			await gitRetry(() => git.fetch(["--prune", "origin"]));
			config.currentBranch = config.currentBranch || await getDefaultBranch(git);
			await resetToBranch(config.currentBranch);
			await cleanLocalBranches();
			const durationMs = Math.round(Date.now() - fetchStart);
			logger.info({ durationMs }, "git fetch completed");
			clone = false;
		} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
			if (err.message === "empty") throw err;
			logger.info({ err }, "git fetch error, falling back to git clone");
		}
	});
	if (clone) await instrument("clone", async () => {
		const cloneStart = Date.now();
		try {
			const opts = [];
			if (config.defaultBranch) opts.push("-b", config.defaultBranch);
			if (config.fullClone) logger.debug("Performing full clone");
			else {
				logger.debug("Performing blobless clone");
				opts.push("--filter=blob:none");
			}
			if (config.extraCloneOpts) Object.entries(config.extraCloneOpts).forEach((e) => opts.push(e[0], `${e[1]}`));
			async function emptyDirAndClone() {
				await instrument(`fs.emptyDir(${localDir})`, () => fs.emptyDir(localDir));
				await git.clone(config.url, ".", opts);
			}
			await gitRetry(() => instrument("emptyDirAndClone", emptyDirAndClone));
		} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
			logger.debug({ err }, "git clone error");
			if (err.message?.includes("No space left on device")) throw new Error(SYSTEM_INSUFFICIENT_DISK_SPACE);
			if (err.message === "empty") throw err;
			throw new ExternalHostError(err, "git");
		}
		const durationMs = Math.round(Date.now() - cloneStart);
		logger.debug({ durationMs }, "git clone completed");
	});
	try {
		config.currentBranchSha = toLongCommitSha((await git.raw(["rev-parse", "HEAD"])).trim());
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		if (err.message?.includes("fatal: not a git repository")) throw new Error(REPOSITORY_CHANGED);
		throw err;
	}
	await instrument("cloneSubmodules", () => cloneSubmodules(!!config.cloneSubmodules, config.cloneSubmodulesFilter));
	try {
		const latestCommit = (await git.log({ n: 1 })).latest;
		logger.debug({ latestCommit }, "latest repository commit");
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		if (err.message.includes("does not have any commits yet")) throw new Error(REPOSITORY_EMPTY);
		logger.warn({ err }, "Cannot retrieve latest commit");
	}
	config.currentBranch = config.currentBranch ?? config.defaultBranch ?? await getDefaultBranch(git);
	/* v8 ignore next -- TODO: add test #40625 */
	delete getCache()?.semanticCommits;
	if (config.upstreamUrl) {
		const { upstreamUrl } = config;
		await instrument("sync with upstreamUrl", async () => {
			logger.debug(`Bringing default branch up-to-date with ${RENOVATE_FORK_UPSTREAM}, to get latest config`);
			// v8 ignore else -- TODO: add test #40625
			if (!(await git.getRemotes(true)).some((remote) => remote.name === "renovate-fork-upstream")) {
				logger.debug(`Adding remote ${RENOVATE_FORK_UPSTREAM}`);
				await git.addRemote(RENOVATE_FORK_UPSTREAM, upstreamUrl);
			}
			await syncForkWithUpstream(config.currentBranch);
			await fetchBranchCommits(false);
		});
	}
	if (isNonEmptyObject(config.virtualBranches)) {
		const virtualBranches = config.virtualBranches;
		await instrument("fetch virtual branches", async () => {
			await fetchRevSpec(...Object.entries(virtualBranches).map(([name, branch]) => `${branch.ref}:${remoteBranchRef(name)}`));
			logger.debug(`Fetched ${Object.keys(virtualBranches).length} virtual branches`);
		});
	}
	config.currentBranchSha = toLongCommitSha((await git.revparse("HEAD")).trim());
	logger.debug(`Current branch SHA: ${config.currentBranchSha}`);
});
async function getRepoStatus(path) {
	if (isString(path)) {
		const localDir = GlobalConfig.get("localDir");
		const localPath = upath.resolve(localDir, path);
		if (!localPath.startsWith(upath.resolve(localDir))) {
			logger.warn({
				localPath,
				localDir
			}, "Preventing access to file outside the local directory");
			throw new Error(INVALID_PATH);
		}
	}
	await syncGit();
	return git.status(path ? [path] : []);
}
function branchExists(branchName) {
	return !!config.branchCommits[branchName];
}
function getBranchCommit(branchName) {
	return config.branchCommits?.[branchName] || null;
}
async function getBranchUpdateDate(branchName) {
	const branchSha = config.branchCommits[branchName];
	if (!branchSha) return null;
	const updateDate = getCachedUpdateDateResult(branchName, branchSha);
	if (updateDate !== null) {
		logger.debug(`getBranchUpdateDate(): using cached result "${updateDate.toISO()}"`);
		return updateDate;
	}
	await syncGit();
	try {
		const result = await getCommitDate(branchSha);
		setCachedUpdateDateResult(branchName, result);
		return result;
	} catch (err) {
		logger.debug({
			err,
			branchName
		}, "Error getting branch update date");
		return null;
	}
}
async function getAllBranchUpdateDates() {
	logger.debug("getAllBranchUpdateDates");
	await syncGit();
	const raw = await git.raw([
		"for-each-ref",
		"--format=%(refname:short) %(committerdate:iso-strict)",
		"refs/remotes/origin/"
	]);
	const result = {};
	const lines = raw.trim().split(newlineRegex).filter(isNonEmptyStringAndNotWhitespace);
	for (const line of lines) {
		const [refShort, isoDate] = line.split(" ");
		if (refShort === "origin") continue;
		const branchName = refShort.replace(regEx(/^origin\//), "");
		result[branchName] = DateTime.fromISO(isoDate).toUTC();
	}
	return result;
}
async function getCommitMessages() {
	logger.debug("getCommitMessages");
	// v8 ignore else -- TODO: add test #40625
	if (GlobalConfig.get("platform") !== "local") await syncGit();
	try {
		return (await git.log({
			n: 20,
			format: { message: "%s" },
			"--no-merges": null
		})).all.map((commit) => commit.message);
	} catch /* v8 ignore next -- TODO: add test #40625 */ {
		return [];
	}
}
async function checkoutBranch(branchName) {
	logger.debug(`Setting current branch to ${branchName}`);
	await syncGit();
	try {
		await gitRetry(() => git.checkout(submodulesInitizialized ? [
			"-f",
			"--recurse-submodules",
			branchName,
			"--"
		] : [
			"-f",
			branchName,
			"--"
		]));
		config.currentBranch = branchName;
		config.currentBranchSha = toLongCommitSha((await git.raw(["rev-parse", "HEAD"])).trim());
		const latestCommitDate = await getCommitDate(config.currentBranchSha);
		// v8 ignore else -- TODO: add test #40625
		if (latestCommitDate) logger.debug({
			branchName,
			latestCommitDate,
			sha: config.currentBranchSha
		}, "latest commit");
		await git.reset(ResetMode.HARD);
		return config.currentBranchSha;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		if (err.message?.includes("fatal: ambiguous argument")) {
			logger.warn({ err }, "Failed to checkout branch");
			throw new Error(TEMPORARY_ERROR);
		}
		throw err;
	}
}
async function checkoutBranchFromRemote(branchName, remoteName) {
	logger.debug(`Checking out branch ${branchName} from remote ${remoteName}`);
	await syncGit();
	try {
		await gitRetry(() => git.checkoutBranch(branchName, `${remoteName}/${branchName}`));
		config.currentBranch = branchName;
		config.currentBranchSha = toLongCommitSha((await git.revparse("HEAD")).trim());
		logger.debug(`Checked out branch ${branchName} from remote ${remoteName}`);
		config.branchCommits[branchName] = config.currentBranchSha;
		return config.currentBranchSha;
	} catch (err) {
		const errChecked = checkForPlatformFailure(err);
		/* v8 ignore if -- TODO: add test #40625 */
		if (errChecked) throw errChecked;
		if (err.message?.includes("fatal: ambiguous argument")) {
			logger.warn({ err }, "Failed to checkout branch");
			throw new Error(TEMPORARY_ERROR);
		}
		throw err;
	}
}
/**
* Returns the remote-tracking ref path for a virtual branch.
*/
function remoteBranchRef(branchName) {
	return `refs/remotes/origin/${branchName}`;
}
/**
* Returns whether the given branch is tracked as a virtual branch.
*/
function isVirtualBranch(branchName) {
	return branchName in config.virtualBranches;
}
/**
* Set a virtual branch's remote-tracking ref and add it to the
* virtual-branch registry (config.virtualBranches).
*
* Used after pushing (to keep tracking in sync with the remote) and in
* createPr() when the Gerrit change ref becomes available.
*
* @param branchName Virtual branch name to set
* @param ref The ref this virtual branch is fetched from (e.g., 'refs/changes/34/1234/1')
* @param commitSha The commit SHA the virtual branch points to.
*/
async function setVirtualBranch(branchName, ref, commitSha) {
	logger.debug({
		branchName,
		ref,
		commitSha
	}, "setVirtualBranch()");
	await git.raw([
		"update-ref",
		remoteBranchRef(branchName),
		commitSha
	]);
	config.branchCommits[branchName] = commitSha;
	config.virtualBranches[branchName] = {
		ref,
		sha: commitSha
	};
	config.branchIsModified[branchName] = false;
}
async function resetHardFromRemote(remoteAndBranch) {
	try {
		const resetLog = await git.reset(["--hard", remoteAndBranch]);
		logger.debug({ resetLog }, "git reset log");
	} catch (err) {
		logger.error({ err }, "Error during git reset --hard");
		throw err;
	}
}
async function forcePushToRemote(branchName, remote) {
	try {
		const pushLog = await git.push([
			remote,
			branchName,
			"--force"
		]);
		logger.debug({ pushLog }, "git push log");
	} catch (err) {
		logger.error({ err }, "Error during git push --force");
		throw err;
	}
}
async function getFileList() {
	await syncGit();
	const branch = config.currentBranch;
	let files;
	try {
		files = await git.raw([
			"ls-tree",
			"-r",
			`refs/heads/${branch}`
		]);
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		if (err.message?.includes("fatal: Not a valid object name")) {
			logger.debug({ err }, "Branch not found when checking branch list - aborting");
			throw new Error(REPOSITORY_CHANGED);
		}
		throw err;
	}
	/* v8 ignore if -- TODO: add test #40625 */
	if (!files) return [];
	return files.split(newlineRegex).filter(isString).filter((line) => line.startsWith("100")).map((line) => line.split(regEx(/\t/)).pop());
}
function getBranchList() {
	return Object.keys(coerceObject(config.branchCommits));
}
async function isBranchBehindBase(branchName, baseBranch) {
	const baseBranchSha = getBranchCommit(baseBranch);
	const branchSha = getBranchCommit(branchName);
	let isBehind = getCachedBehindBaseResult(branchName, branchSha, baseBranch, baseBranchSha);
	if (isBehind !== null) {
		logger.debug(`branch.isBehindBase(): using cached result "${isBehind}"`);
		return isBehind;
	}
	logger.debug(`branch.isBehindBase(): using git to calculate against baseBranch "${baseBranch}"`);
	await syncGit();
	try {
		isBehind = (await git.raw([
			"rev-list",
			"--count",
			`${branchSha}..${baseBranchSha}`
		])).trim() !== "0";
		logger.debug({
			baseBranch,
			branchName
		}, `branch.isBehindBase(): ${isBehind}`);
		setCachedBehindBaseResult(branchName, isBehind);
		return isBehind;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		throw err;
	}
}
async function isBranchModified(branchName, baseBranch) {
	if (!branchExists(branchName)) {
		logger.debug("branch.isModified(): no cache");
		return false;
	}
	if (config.branchIsModified[branchName] !== void 0) return config.branchIsModified[branchName];
	const isModified = getCachedModifiedResult(branchName, getBranchCommit(branchName));
	if (isModified !== null) {
		logger.debug(`branch.isModified(): using cached result "${isModified}"`);
		config.branchIsModified[branchName] = isModified;
		return isModified;
	}
	logger.debug(`branch.isModified(): using git to calculate against baseBranch "${baseBranch}"`);
	await syncGit();
	const committedAuthors = /* @__PURE__ */ new Set();
	try {
		const commits = await git.log({
			from: `origin/${baseBranch}`,
			to: `origin/${branchName}`,
			symmetric: false,
			format: {
				author_email: "%ae",
				committer_email: "%ce"
			}
		});
		for (const commit of commits.all) {
			committedAuthors.add(commit.author_email);
			committedAuthors.add(commit.committer_email);
		}
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		if (err.message?.includes("fatal: bad revision")) {
			logger.debug({ err }, "Remote branch not found when checking last commit author - aborting run");
			throw new Error(REPOSITORY_CHANGED);
		}
		logger.warn({ err }, "Error checking last author for isBranchModified");
	}
	const { gitAuthorEmail, ignoredAuthors } = config;
	const includedAuthors = /* @__PURE__ */ new Set();
	for (const committedAuthor of committedAuthors) if (committedAuthor !== gitAuthorEmail && !ignoredAuthors.includes(committedAuthor) && !matchRegexOrGlobList(committedAuthor, ignoredAuthors)) includedAuthors.add(committedAuthor);
	for (const ignoredAuthor of platformIgnoredAuthors) includedAuthors.delete(ignoredAuthor);
	if (includedAuthors.size === 0) {
		logger.trace({
			branchName,
			baseBranch,
			committedAuthors: [...committedAuthors],
			includedAuthors: [...includedAuthors],
			gitAuthorEmail,
			ignoredAuthors
		}, "branch.isModified() = false");
		logger.debug("branch.isModified() = false");
		config.branchIsModified[branchName] = false;
		setCachedModifiedResult(branchName, false);
		return false;
	}
	logger.trace({
		branchName,
		baseBranch,
		committedAuthors: [...committedAuthors],
		includedAuthors: [...includedAuthors],
		gitAuthorEmail,
		ignoredAuthors
	}, "branch.isModified() = true");
	logger.debug({
		baseBranch,
		branchName,
		unrecognizedAuthors: [...includedAuthors]
	}, "branch.isModified() = true");
	config.branchIsModified[branchName] = true;
	setCachedModifiedResult(branchName, true);
	return true;
}
async function isBranchConflicted(baseBranch, branch) {
	logger.debug(`isBranchConflicted(${baseBranch}, ${branch})`);
	const baseBranchSha = getBranchCommit(baseBranch);
	const branchSha = getBranchCommit(branch);
	if (!baseBranchSha || !branchSha) {
		logger.warn({
			baseBranch,
			branch
		}, "isBranchConflicted: branch does not exist");
		return true;
	}
	const isConflicted = getCachedConflictResult(branch, branchSha, baseBranch, baseBranchSha);
	if (isBoolean(isConflicted)) {
		logger.debug(`branch.isConflicted(): using cached result "${isConflicted}"`);
		return isConflicted;
	}
	logger.debug(`branch.isConflicted(): using git to calculate against baseBranch ${baseBranch}`);
	let result = false;
	await syncGit();
	await writeGitAuthor();
	const origBranch = config.currentBranch;
	try {
		await git.reset(ResetMode.HARD);
		if (origBranch !== baseBranch) await git.checkout(baseBranch);
		await git.merge([
			"--no-commit",
			"--no-ff",
			`origin/${branch}`
		]);
	} catch (err) {
		result = true;
		/* v8 ignore if -- TODO: add test #40625 */
		if (!err?.git?.conflicts?.length) logger.debug({
			baseBranch,
			branch,
			err
		}, "isBranchConflicted: unknown error");
	} finally {
		try {
			await git.merge(["--abort"]);
			if (origBranch !== baseBranch) await git.checkout(origBranch);
		} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
			logger.debug({
				baseBranch,
				branch,
				err
			}, "isBranchConflicted: cleanup error");
		}
	}
	setCachedConflictResult(branch, result);
	logger.debug(`branch.isConflicted(): ${result}`);
	return result;
}
async function deleteBranch(branchName) {
	await syncGit();
	if (isVirtualBranch(branchName)) {
		const ref = remoteBranchRef(branchName);
		logger.debug({
			branchName,
			ref
		}, "Deleting virtual branch");
		await git.raw([
			"update-ref",
			"-d",
			ref
		]);
		delete config.virtualBranches[branchName];
	} else try {
		const deleteCommand = [
			"push",
			"--delete",
			"origin",
			branchName
		];
		if (getNoVerify().includes("push")) deleteCommand.push("--no-verify");
		await gitRetry(() => git.raw(deleteCommand));
		logger.debug(`Deleted remote branch: ${branchName}`);
	} catch (err) {
		const errChecked = checkForPlatformFailure(err);
		/* v8 ignore if -- TODO: add test #40625 */
		if (errChecked) throw errChecked;
		logger.debug(`No remote branch to delete with name: ${branchName}`);
	}
	try {
		await deleteLocalBranch(branchName);
		/* v8 ignore next -- TODO: add test #40625 (always throws) */
		logger.debug(`Deleted local branch: ${branchName}`);
	} catch (err) {
		const errChecked = checkForPlatformFailure(err);
		/* v8 ignore if -- TODO: add test #40625 */
		if (errChecked) throw errChecked;
		logger.debug(`No local branch to delete with name: ${branchName}`);
	}
	delete config.branchCommits[branchName];
}
async function mergeToLocal(branchName) {
	let status;
	try {
		await syncGit();
		await writeGitAuthor();
		await git.reset(ResetMode.HARD);
		await gitRetry(() => git.checkout([
			"-B",
			config.currentBranch,
			`origin/${config.currentBranch}`
		]));
		status = await git.status();
		if (isVirtualBranch(branchName)) {
			const ref = remoteBranchRef(branchName);
			logger.debug({
				branchName,
				ref
			}, "mergeToLocal(): merging virtual branch");
			await git.merge([ref]);
		} else {
			await fetchRevSpec(branchName);
			await gitRetry(() => git.merge(["FETCH_HEAD"]));
		}
	} catch (err) {
		logger.debug({
			baseBranch: config.currentBranch,
			baseSha: config.currentBranchSha,
			branchName,
			status,
			err
		}, "mergeLocally error");
		throw err;
	}
}
async function mergeBranch(branchName) {
	let status;
	try {
		await syncGit();
		await writeGitAuthor();
		await git.reset(ResetMode.HARD);
		await gitRetry(() => git.checkout([
			"-B",
			branchName,
			`origin/${branchName}`
		]));
		await gitRetry(() => git.checkout([
			"-B",
			config.currentBranch,
			`origin/${config.currentBranch}`
		]));
		status = await git.status();
		await gitRetry(() => git.merge(["--ff-only", branchName]));
		await gitRetry(() => git.push("origin", config.currentBranch));
		incLimitedValue("Commits");
	} catch (err) {
		logger.debug({
			baseBranch: config.currentBranch,
			baseSha: config.currentBranchSha,
			branchName,
			branchSha: getBranchCommit(branchName),
			status,
			err
		}, "mergeBranch error");
		throw err;
	}
}
async function getCommitDate(ref) {
	const output = await git.show([
		"-s",
		"--format=%cI",
		ref
	]);
	return DateTime.fromISO(output.trim()).toUTC();
}
async function getBranchLastCommitTime(branchName) {
	await syncGit();
	try {
		return (await getCommitDate(`origin/${branchName}`)).toJSDate();
	} catch (err) {
		const errChecked = checkForPlatformFailure(err);
		/* v8 ignore next -- TODO: add test */
		if (errChecked) throw errChecked;
		return DateTime.now().toJSDate();
	}
}
function getBranchFiles(branchName) {
	return getBranchFilesFromRef(`origin/${branchName}`);
}
function getBranchFilesFromCommit(referenceCommit) {
	return getBranchFilesFromRef(referenceCommit);
}
async function getBranchFilesFromRef(refName) {
	await syncGit();
	try {
		return (await gitRetry(() => git.diffSummary([refName, `${refName}^`]))).files.map((file) => file.file);
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, "getBranchFilesFromRef error");
		const errChecked = checkForPlatformFailure(err);
		if (errChecked) throw errChecked;
		return null;
	}
}
async function getFile(filePath, branchName) {
	await syncGit();
	try {
		const content = await git.show([`origin/${branchName ?? config.currentBranch}:${filePath}`]);
		logWarningIfUnicodeHiddenCharactersInPackageFile(filePath, content);
		return content;
	} catch (err) {
		const errChecked = checkForPlatformFailure(err);
		/* v8 ignore if -- TODO: add test #40625 */
		if (errChecked) throw errChecked;
		return null;
	}
}
async function getFiles(fileNames) {
	const fileContentMap = {};
	for (const fileName of fileNames) fileContentMap[fileName] = await getFile(fileName);
	return fileContentMap;
}
async function hasDiff(sourceRef, targetRef) {
	await syncGit();
	try {
		return await gitRetry(() => git.diff([
			sourceRef,
			targetRef,
			"--"
		])) !== "";
	} catch {
		return true;
	}
}
async function handleCommitAuth(localDir) {
	if (!privateKeySet) {
		await writePrivateKey();
		privateKeySet = true;
	}
	await configSigningKey(localDir);
	await writeGitAuthor();
}
/**
*
* Prepare local branch with commit
*
* 0. Hard reset
* 1. Creates local branch with `origin/` prefix
* 2. Perform `git add` (respecting mode) and `git remove` for each file
* 3. Perform commit
* 4. Check whether resulting commit is empty or not (due to .gitignore)
* 5. If not empty, return commit info for further processing
*
*/
async function prepareCommit({ branchName, files, message, trailers, force = false }) {
	const localDir = GlobalConfig.get("localDir");
	await syncGit();
	logger.debug(`Preparing files for committing to branch ${branchName}`);
	await handleCommitAuth(localDir);
	try {
		await git.reset(ResetMode.HARD);
		await git.raw(["clean", "-fd"]);
		const parentCommitSha = config.currentBranchSha;
		await gitRetry(() => git.checkout([
			"-B",
			branchName,
			`origin/${config.currentBranch}`
		]));
		const deletedFiles = [];
		const addedModifiedFiles = [];
		const ignoredFiles = [];
		for (const file of files) {
			const fileName = file.path;
			if (file.type === "deletion") try {
				await git.rm([fileName]);
				deletedFiles.push(fileName);
			} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
				const errChecked = checkForPlatformFailure(err);
				if (errChecked) throw errChecked;
				logger.trace({
					err,
					fileName
				}, "Cannot delete file");
				ignoredFiles.push(fileName);
			}
			else {
				if (await isDirectory(upath.join(localDir, fileName))) logger.trace({ fileName }, "Adding directory commit");
				else if (file.contents === null) continue;
				else {
					let contents;
					/* v8 ignore else -- TODO: add test #40625 */
					if (isString(file.contents)) contents = Buffer.from(file.contents);
					else contents = file.contents;
					if (file.isSymlink) await fs.symlink(file.contents, upath.join(localDir, fileName));
					else await fs.outputFile(upath.join(localDir, fileName), contents, { mode: file.isExecutable ? 511 : 438 });
				}
				try {
					/* v8 ignore next -- TODO: add test #40625 */
					const addParams = fileName === getConfigFileNames()[0] ? ["-f", fileName] : fileName;
					await git.add(addParams);
					if (file.isExecutable) await git.raw([
						"update-index",
						"--chmod=+x",
						fileName
					]);
					addedModifiedFiles.push(fileName);
				} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
					if (!err.message.includes("The following paths are ignored by one of your .gitignore files")) throw err;
					logger.debug(`Cannot commit ignored file: ${fileName}`);
					ignoredFiles.push(file.path);
				}
			}
		}
		const commitOptions = {};
		if (getNoVerify().includes("commit")) commitOptions["--no-verify"] = null;
		const commitMessage = formatCommitMessage(message, trailers);
		const commitRes = await git.commit(commitMessage, [], commitOptions);
		if (isNonEmptyObject(commitRes.summary) && commitRes.summary.changes === 0 && commitRes.summary.insertions === 0 && commitRes.summary.deletions === 0) {
			logger.warn({ commitRes }, "Detected empty commit - aborting git push");
			return null;
		}
		logger.debug({
			deletedFiles,
			ignoredFiles,
			result: commitRes
		}, `git commit`);
		if (!force && !await hasDiff("HEAD", `origin/${branchName}`)) {
			logger.debug({
				branchName,
				deletedFiles,
				addedModifiedFiles,
				ignoredFiles
			}, "No file changes detected. Skipping commit");
			return null;
		}
		return {
			parentCommitSha,
			commitSha: toLongCommitSha((await git.revparse([branchName])).trim()),
			files: files.filter((fileChange) => {
				if (fileChange.type === "deletion") return deletedFiles.includes(fileChange.path);
				return addedModifiedFiles.includes(fileChange.path);
			})
		};
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		return handleCommitError(err, branchName, files);
	}
}
async function pushCommit({ sourceRef, targetRef, files, pushOptions }) {
	await syncGit();
	logger.debug(`Pushing refSpec ${sourceRef}:${targetRef ?? sourceRef}`);
	let result = false;
	try {
		const gitOptions = {
			"--force-with-lease": null,
			"-u": null
		};
		if (getNoVerify().includes("push")) gitOptions["--no-verify"] = null;
		if (pushOptions) gitOptions["--push-option"] = pushOptions;
		const pushRes = await gitRetry(() => git.push("origin", `${sourceRef}:${targetRef ?? sourceRef}`, gitOptions));
		delete pushRes.repo;
		logger.debug({ result: pushRes }, "git push");
		incLimitedValue("Commits");
		incCountValue("HourlyCommits");
		result = true;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		handleCommitError(err, sourceRef, files);
	}
	return result;
}
async function fetchBranch(branchName) {
	await syncGit();
	logger.debug(`Fetching branch ${branchName}`);
	try {
		const ref = `refs/heads/${branchName}:${remoteBranchRef(branchName)}`;
		await gitRetry(() => git.pull([
			"origin",
			ref,
			"--force"
		]));
		const commit = toLongCommitSha((await git.revparse([branchName])).trim());
		config.branchCommits[branchName] = commit;
		config.branchIsModified[branchName] = false;
		return commit;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		return handleCommitError(err, branchName);
	}
}
async function commitFiles(commitConfig) {
	try {
		const commitResult = await prepareCommit(commitConfig);
		if (commitResult) {
			// v8 ignore else -- TODO: add test #40625
			if (await pushCommit({
				sourceRef: commitConfig.branchName,
				files: commitConfig.files
			})) {
				const { branchName } = commitConfig;
				const { commitSha } = commitResult;
				config.branchCommits[branchName] = commitSha;
				config.branchIsModified[branchName] = false;
				return commitSha;
			}
		}
		return null;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		if (err.message.includes("[rejected] (stale info)")) throw new Error(REPOSITORY_CHANGED);
		throw err;
	}
}
function getUrl({ protocol, auth, hostname, host, repository }) {
	if (protocol === "ssh") return `git@${hostname}:${repository}.git`;
	return URL.format({
		protocol: protocol ?? "https",
		auth,
		hostname,
		host,
		pathname: `${repository}.git`
	});
}
let remoteRefsExist = false;
/**
*
* Non-branch refs allow us to store git objects without triggering CI pipelines.
* It's useful for API-based branch rebasing.
*
* @see https://stackoverflow.com/questions/63866947/pushing-git-non-branch-references-to-a-remote/63868286
*
*/
async function pushCommitToRenovateRef(commitSha, refName) {
	const fullRefName = `refs/renovate/branches/${refName}`;
	await git.raw([
		"update-ref",
		fullRefName,
		commitSha
	]);
	await git.push([
		"--force",
		"origin",
		fullRefName
	]);
	remoteRefsExist = true;
}
/**
*
* Removes all remote "refs/renovate/branches/*" refs in two steps:
*
* Step 1: list refs
*
*   $ git ls-remote origin "refs/renovate/branches/*"
*
*   > cca38e9ea6d10946bdb2d0ca5a52c205783897aa        refs/renovate/branches/foo
*   > 29ac154936c880068994e17eb7f12da7fdca70e5        refs/renovate/branches/bar
*   > 3fafaddc339894b6d4f97595940fd91af71d0355        refs/renovate/branches/baz
*   > ...
*
* Step 2:
*
*   $ git push --delete origin refs/renovate/branches/foo refs/renovate/branches/bar refs/renovate/branches/baz
*
* If Step 2 fails because the repo doesn't allow bulk changes, we'll remove them one by one instead:
*
*   $ git push --delete origin refs/renovate/branches/foo
*   $ git push --delete origin refs/renovate/branches/bar
*   $ git push --delete origin refs/renovate/branches/baz
*/
async function clearRenovateRefs() {
	if (!gitInitialized || !remoteRefsExist) return;
	logger.debug(`Cleaning up Renovate refs: refs/renovate/branches/*`);
	const renovateRefs = [];
	try {
		const refs = (await git.listRemote([config.url, "refs/renovate/branches/*"])).split(newlineRegex).map((line) => line.replace(regEx(/[0-9a-f]+\s+/i), "").trim()).filter((line) => line.startsWith("refs/renovate/branches/"));
		renovateRefs.push(...refs);
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, `Renovate refs cleanup error`);
	}
	// v8 ignore else -- TODO: add test #40625
	if (renovateRefs.length) try {
		const pushOpts = [
			"--delete",
			"origin",
			...renovateRefs
		];
		await git.push(pushOpts);
	} catch (err) {
		/* v8 ignore else -- TODO: add test #40625 */
		if (bulkChangesDisallowed(err)) for (const ref of renovateRefs) try {
			const pushOpts = [
				"--delete",
				"origin",
				ref
			];
			await git.push(pushOpts);
		} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
			logger.debug({ err }, "Error deleting \"refs/renovate/branches/*\"");
			break;
		}
		else logger.warn({ err }, "Error deleting \"refs/renovate/branches/*\"");
	}
	remoteRefsExist = false;
}
const diffTreeLineRegex = regEx(/^:(?<oldMode>\d{6})\s+(?<newMode>\d{6})\s+(?<oldSha>[0-9a-f]{40})\s+(?<newSha>[0-9a-f]{40})\s+(?<status>[A-Z]\d*)\t(?<paths>.+)$/);
const treeShaRegex = regEx(/tree\s+(?<treeSha>[0-9a-f]{40})\s*/);
/**
* Get the tree SHA for a commit.
*/
async function getCommitTreeSha(commitSha) {
	const commitOutput = await git.catFile(["-p", commitSha]);
	const { treeSha } = coerceObject(treeShaRegex.exec(commitOutput)?.groups);
	if (!treeSha) {
		const snippet = commitOutput.split(newlineRegex)[0];
		/* v8 ignore next -- tested, but v8 reports template literal as partial */
		throw new Error(`Could not extract tree SHA from commit ${commitSha}: ${snippet}`);
	}
	return toLongCommitSha(treeSha);
}
function treeTypeFromMode(mode) {
	switch (mode) {
		case GitTreeMode.Gitlink: return "commit";
		case GitTreeMode.Directory: return "tree";
		default: return "blob";
	}
}
/**
* Return only the files that changed between two commits.
* Deletions have `sha: null` (for use with GitHub's `base_tree` API).
*/
async function diffCommitTree(parentCommitSha, commitSha) {
	const output = await git.raw([
		"diff-tree",
		"-M",
		"-r",
		"--no-commit-id",
		parentCommitSha,
		commitSha
	]);
	const result = [];
	for (const line of output.split(newlineRegex)) {
		const matchGroups = diffTreeLineRegex.exec(line)?.groups;
		if (matchGroups) {
			const { oldMode, newMode, newSha, status, paths } = matchGroups;
			const statusCode = status[0];
			const [sourcePath, targetPath] = paths.split("	");
			switch (statusCode) {
				case "D":
					result.push({
						path: sourcePath,
						mode: oldMode,
						type: treeTypeFromMode(oldMode),
						sha: null
					});
					break;
				case "R":
					result.push({
						path: sourcePath,
						mode: oldMode,
						type: treeTypeFromMode(oldMode),
						sha: null
					});
					result.push({
						path: targetPath,
						mode: newMode,
						type: treeTypeFromMode(newMode),
						sha: toLongCommitSha(newSha)
					});
					break;
				default: result.push({
					path: targetPath ?? sourcePath,
					mode: newMode,
					type: treeTypeFromMode(newMode),
					sha: toLongCommitSha(newSha)
				});
			}
		}
	}
	return result;
}
async function localBranchExists(branchName) {
	await syncGit();
	return (await git.branchLocal()).all.includes(branchName);
}
/**
* Synchronize a forked branch with its upstream counterpart.
*
* syncForkWithUpstream updates the fork's branch, to match the corresponding branch in the upstream repository.
* The steps are:
* 1. Check if the branch exists locally.
* 2. If the branch exists locally: checkout the local branch.
* 3. If the branch does _not_ exist locally: checkout the upstream branch.
* 4. Reset the local branch to match the upstream branch.
* 5. Force push the (updated) local branch to the origin repository.
*
* @param {string} branchName - The name of the branch to synchronize.
* @returns A promise that resolves to True if the synchronization is successful, or `false` if an error occurs.
*/
async function syncForkWithUpstream(branchName) {
	if (!config.upstreamUrl) return;
	logger.debug(`Synchronizing fork with "${RENOVATE_FORK_UPSTREAM}" remote for branch ${branchName}`);
	/* v8 ignore if -- this should not be possible if upstreamUrl exists */
	if (!(await getRemotes()).some((r) => r === "renovate-fork-upstream")) throw new Error("No upstream remote exists, cannot sync fork");
	try {
		await git.fetch([RENOVATE_FORK_UPSTREAM]);
		if (await localBranchExists(branchName)) await checkoutBranch(branchName);
		else await checkoutBranchFromRemote(branchName, RENOVATE_FORK_UPSTREAM);
		await resetHardFromRemote(`${RENOVATE_FORK_UPSTREAM}/${branchName}`);
		await forcePushToRemote(branchName, "origin");
	} catch (err) /* v8 ignore next -- shouldn't happen */ {
		logger.error({ err }, "Error synchronizing fork");
		throw new Error(UNKNOWN_ERROR);
	}
}
async function getRemotes() {
	logger.debug("git.getRemotes()");
	try {
		await syncGit();
		const remotes = await git.getRemotes();
		logger.debug(`Found remotes: ${remotes.map((r) => r.name).join(", ")}`);
		return remotes.map((remote) => remote.name);
	} catch (err) /* v8 ignore next -- git.getRemotes only fails on repo corruption, not simulated in specs */ {
		logger.error({ err }, "Error getting remotes");
		throw err;
	}
}
//#endregion
export { GIT_MINIMUM_VERSION, RENOVATE_FORK_UPSTREAM, branchExists, checkoutBranch, checkoutBranchFromRemote, clearBranchIsModifiedCache, clearRenovateRefs, cloneSubmodules, commitFiles, createSimpleGit, deleteBranch, diffCommitTree, fetchBranch, fetchRevSpec, forcePushToRemote, getAllBranchUpdateDates, getBranchCommit, getBranchFiles, getBranchFilesFromCommit, getBranchLastCommitTime, getBranchList, getBranchUpdateDate, getCommitMessages, getCommitTreeSha, getFile, getFileList, getFiles, getRemotes, getRepoStatus, getSubmodules, getUrl, gitRetry, hasDiff, initRepo, isBranchBehindBase, isBranchConflicted, isBranchModified, isCloned, isFileModeEnabled, mergeBranch, mergeToLocal, prepareCommit, pushCommit, pushCommitToRenovateRef, remoteBranchRef, resetHardFromRemote, resetToCommit, setGitAuthor, setNoVerify, setPlatformIgnoredAuthors, setPrivateKey, setUserRepoConfig, setVirtualBranch, syncForkWithUpstream, syncGit, validateGitVersion, writeGitAuthor };

//# sourceMappingURL=index.js.map