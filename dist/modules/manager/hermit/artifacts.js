import { ExecError } from "../../../util/exec/exec-error.js";
import { logger } from "../../../logger/index.js";
import { localPathIsSymbolicLink, readLocalSymlink } from "../../../util/fs/index.js";
import { map } from "../../../util/promises.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { withGitEnvironment } from "../../../util/git/exec.js";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/hermit/artifacts.ts
const gitExec = withGitEnvironment(["hermit"]);
/**
* updateArtifacts runs hermit install for each updated dependencies
*/
async function updateArtifacts(update) {
	const { packageFileName } = update;
	try {
		await updateHermitPackage(update);
	} catch (err) {
		logger.debug({ err }, `error updating hermit packages.`);
		if (err instanceof UpdateHermitError) return [{ artifactError: {
			fileName: `from: ${err.from}, to: ${err.to}`,
			stderr: err.stderr
		} }];
		return [{ artifactError: { stderr: err instanceof Error ? err.message : String(err) } }];
	}
	logger.debug(`scanning the changes after update`);
	let updateResult = null;
	try {
		updateResult = await getUpdateResult(packageFileName);
		logger.debug({ updateResult }, `update result for hermit`);
	} catch (err) {
		logger.debug({ err }, "Error getting hermet update results");
		return [{ artifactError: { stderr: err.message } }];
	}
	return updateResult;
}
/**
* getContent returns the content of either link or a normal file
*/
async function getContent(file) {
	let contents = "";
	const isSymlink = await localPathIsSymbolicLink(file);
	// v8 ignore else -- hermit always tracks its packages as symlinks
	if (isSymlink) contents = await readLocalSymlink(file);
	if (contents === null) throw new Error(`error getting content for ${file}`);
	return {
		isSymlink,
		contents
	};
}
/**
* getAddResult returns the UpdateArtifactsResult for the added files
*/
function getAddResult(path, contentRes) {
	return { file: {
		type: "addition",
		path,
		contents: contentRes.contents,
		isSymlink: contentRes.isSymlink,
		isExecutable: contentRes.isExecutable
	} };
}
/**
* getDeleteResult returns the UpdateArtifactsResult for deleted files
*/
function getDeleteResult(path) {
	return { file: {
		type: "deletion",
		path
	} };
}
/**
* getUpdateResult will return the update result after `hermit install`
* has been performed for all packages
*/
async function getUpdateResult(packageFileName) {
	const hermitFolder = `${upath.dirname(packageFileName)}/`;
	const hermitChanges = await getRepoStatus(hermitFolder);
	logger.debug({
		hermitChanges,
		hermitFolder
	}, `hermit changes after package update`);
	const added = await map([...hermitChanges.created, ...hermitChanges.not_added], async (path) => {
		return getAddResult(path, await getContent(path));
	});
	const deleted = hermitChanges.deleted.map(getDeleteResult);
	const modified = await map(hermitChanges.modified, async (path) => {
		const contents = await getContent(path);
		return [getDeleteResult(path), getAddResult(path, contents)];
	});
	return [
		...(await map(hermitChanges.renamed, async (renamed) => {
			const from = renamed.from;
			const to = renamed.to;
			const toContents = await getContent(to);
			return [getDeleteResult(from), getAddResult(to, toContents)];
		})).flat(),
		...modified.flat(),
		...added,
		...deleted
	];
}
/**
* getHermitPackage returns the hermit package for running the hermit install
*/
function getHermitPackage(name, version) {
	return `${name}-${version}`;
}
/**
* updateHermitPackage runs hermit install for the given package
*/
async function updateHermitPackage(update) {
	logger.trace({ update }, `hermit.updateHermitPackage()`);
	const toInstall = [];
	const from = [];
	const toUninstall = [];
	for (const pkg of update.updatedDeps) {
		if (!pkg.depName || !pkg.currentVersion || !pkg.newValue) {
			logger.debug({
				depName: pkg.depName,
				currentVersion: pkg.currentVersion,
				newValue: pkg.newValue
			}, "missing package update information");
			throw new UpdateHermitError(getHermitPackage(pkg.depName ?? "", pkg.currentVersion ?? ""), getHermitPackage(pkg.depName ?? "", pkg.newValue ?? ""), "invalid package to update");
		}
		const depName = pkg.depName;
		const newName = pkg.newName;
		const currentVersion = pkg.currentVersion;
		const newValue = pkg.newValue;
		const fromPackage = getHermitPackage(depName, currentVersion);
		const toPackage = getHermitPackage(newName ?? depName, newValue);
		toInstall.push(toPackage);
		from.push(fromPackage);
		if (pkg.updateType === "replacement" && newName !== depName) toUninstall.push(depName);
	}
	const execOptions = {
		docker: {},
		cwdFile: update.packageFileName
	};
	const fromPackages = from.map(quote).join(" ");
	if (toUninstall.length > 0) {
		const packagesToUninstall = toUninstall.map(quote).join(" ");
		const uninstallCommands = `./hermit uninstall ${packagesToUninstall}`;
		try {
			const result = await gitExec(uninstallCommands, execOptions);
			logger.trace({ stdout: result.stdout }, `hermit uninstall command stdout`);
		} catch (e) {
			logger.warn({ err: e }, `error uninstall hermit package for replacement`);
			if (!(e instanceof ExecError)) throw e;
			throw new UpdateHermitError(fromPackages, packagesToUninstall, e.stderr, e.stdout);
		}
	}
	const packagesToInstall = toInstall.map(quote).join(" ");
	const execCommands = `./hermit install ${packagesToInstall}`;
	logger.debug({
		packageFile: update.packageFileName,
		packagesToInstall
	}, `performing updates`);
	try {
		const result = await gitExec(execCommands, execOptions);
		logger.trace({ stdout: result.stdout }, `hermit command stdout`);
	} catch (e) {
		logger.warn({ err: e }, `error updating hermit package`);
		if (!(e instanceof ExecError)) throw e;
		throw new UpdateHermitError(fromPackages, packagesToInstall, e.stderr, e.stdout);
	}
}
var UpdateHermitError = class extends Error {
	stdout;
	stderr;
	from;
	to;
	constructor(from, to, stderr, stdout = "") {
		super();
		this.stdout = stdout;
		this.stderr = stderr;
		this.from = from;
		this.to = to;
	}
};
//#endregion
export { UpdateHermitError, updateArtifacts };

//# sourceMappingURL=artifacts.js.map