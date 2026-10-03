import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import "../../versioning/git/index.js";
import { id } from "../../versioning/nixpkgs/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { NixFlakeLock } from "./schema.js";
//#region lib/modules/manager/nix/extract.ts
const lockableHTTPTarballProtocol = regEx("^https://(?<domain>[^/]+)/(?<owner>[^/]+)/(?<repo>[^/]+)/archive/(?<rev>.+).tar.gz$");
const lockableChannelOriginalUrl = regEx("^https://(?:channels\\.nixos\\.org|nixos\\.org/channels)/(?<channel>[^/]+)/nixexprs\\.tar\\.(?:xz|zst)$");
async function extractPackageFile(content, packageFile, config) {
	const flakeLockFile = getSiblingFileName(packageFile, "flake.lock");
	const flakeLockContents = await readLocalFile(flakeLockFile, "utf8");
	logger.trace(`nix.extractPackageFile(${flakeLockFile})`);
	const deps = [];
	const flakeLockParsed = NixFlakeLock.safeParse(flakeLockContents);
	if (!flakeLockParsed.success) {
		logger.debug({
			flakeLockFile,
			err: flakeLockParsed.error
		}, `invalid flake.lock file`);
		return null;
	}
	const flakeLock = flakeLockParsed.data;
	const rootInputs = flakeLock.nodes.root.inputs;
	if (!rootInputs) {
		logger.debug({
			flakeLockFile,
			err: flakeLockParsed.error
		}, `flake.lock is missing "root" node`);
		return null;
	}
	for (const [depName, flakeInput] of Object.entries(flakeLock.nodes)) {
		if (depName === "root") continue;
		if (!(depName in rootInputs)) continue;
		const flakeLocked = flakeInput.locked;
		const flakeOriginal = flakeInput.original;
		if (flakeLocked === void 0) {
			logger.debug({
				flakeLockFile,
				flakeInput
			}, `input is missing locked, skipping`);
			continue;
		}
		if (flakeOriginal === void 0) {
			logger.debug({
				flakeLockFile,
				flakeInput
			}, `input is missing original, skipping`);
			continue;
		}
		if (flakeOriginal.type === "indirect" || flakeLocked.type === "indirect") {
			logger.debug({
				flakeLockFile,
				flakeInput
			}, `input is type indirect, skipping`);
			continue;
		}
		if (flakeOriginal.type === "path" || flakeLocked.type === "path") {
			logger.debug({
				flakeLockFile,
				flakeInput
			}, `input is type path, skipping`);
			continue;
		}
		if (flakeLocked.rev === void 0) {
			logger.debug({
				flakeLockFile,
				flakeInput
			}, `locked input is not tracking a rev, skipping`);
			continue;
		}
		const currentDigest = config?.currentDigest;
		const newDigest = config?.newDigest;
		if (currentDigest && newDigest && flakeOriginal.rev && flakeOriginal.rev === currentDigest && content.includes(newDigest)) {
			logger.debug({
				flakeLockFile,
				flakeInput
			}, `overriding rev ${flakeOriginal.rev} with new digest ${newDigest}`);
			flakeOriginal.rev = newDigest;
		}
		const dep = {
			depName,
			datasource: GitRefsDatasource.id,
			versioning: "git"
		};
		if (flakeOriginal.rev) {
			dep.currentValue = flakeOriginal.ref;
			dep.currentDigest = flakeOriginal.rev;
			dep.replaceString = flakeOriginal.rev;
		} else dep.lockedVersion = flakeLocked.rev;
		switch (flakeLocked.type) {
			case "github":
				if (flakeOriginal.owner?.toLowerCase() === "nixos" && flakeOriginal.repo?.toLowerCase() === "nixpkgs") {
					dep.packageName = "https://github.com/NixOS/nixpkgs";
					dep.currentValue = flakeOriginal.ref;
					dep.versioning = id;
					break;
				}
				dep.packageName = `https://${flakeOriginal.host ?? "github.com"}/${flakeOriginal.owner}/${flakeOriginal.repo}`;
				break;
			case "gitlab":
				dep.packageName = `https://${flakeOriginal.host ?? "gitlab.com"}/${decodeURIComponent(flakeOriginal.owner)}/${flakeOriginal.repo}`;
				break;
			case "git":
				dep.packageName = flakeOriginal.url;
				break;
			case "sourcehut":
				dep.packageName = `https://${flakeOriginal.host ?? "git.sr.ht"}/${flakeOriginal.owner}/${flakeOriginal.repo}`;
				break;
			case "tarball":
				if (flakeOriginal.url && lockableChannelOriginalUrl.test(flakeOriginal.url)) {
					dep.packageName = "https://github.com/NixOS/nixpkgs";
					dep.currentValue = flakeOriginal.url.replace(lockableChannelOriginalUrl, "$<channel>");
					dep.versioning = id;
					break;
				}
				dep.packageName = flakeOriginal.url.replace(lockableHTTPTarballProtocol, "https://$<domain>/$<owner>/$<repo>");
		}
		deps.push(dep);
	}
	if (deps.length) return { deps };
	return null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map