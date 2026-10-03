import { logger } from "../../../../logger/index.js";
import { getSiblingFileName, localPathExists, readLocalFile } from "../../../../util/fs/index.js";
import { extractCatalogDeps } from "./common/catalogs.js";
import { isString } from "@sindresorhus/is";
import { miscUtils, structUtils } from "@yarnpkg/core";
import { parseSyml } from "@yarnpkg/parsers";
//#region lib/modules/manager/npm/extract/yarn.ts
async function getYarnLock(filePath) {
	const yarnLockRaw = await readLocalFile(filePath, "utf8");
	try {
		const parsed = parseSyml(yarnLockRaw);
		const lockedVersions = {};
		let lockfileVersion;
		for (const [key, val] of Object.entries(parsed)) if (key === "__metadata") {
			lockfileVersion = parseInt(val.cacheKey, 10);
			logger.once.debug(`yarn.lock ${filePath} has __metadata.cacheKey=${lockfileVersion}`);
		} else for (const entry of key.split(", ")) try {
			const { scope, name, range } = structUtils.parseDescriptor(entry);
			const packageName = scope ? `@${scope}/${name}` : name;
			const { selector } = structUtils.parseRange(range);
			logger.trace({
				entry,
				version: val.version
			});
			lockedVersions[`${packageName}@${selector}`] = parsed[key].version;
		} catch (err) {
			logger.debug({
				entry,
				err
			}, "Invalid descriptor or range found in yarn.lock");
		}
		const isYarn1 = !("__metadata" in parsed);
		if (isYarn1) logger.once.debug(`yarn.lock ${filePath} is has no __metadata so is yarn 1`);
		else logger.once.debug(`yarn.lock ${filePath} is has __metadata so is yarn 2+`);
		return {
			isYarn1,
			lockfileVersion,
			lockedVersions
		};
	} catch (err) {
		logger.debug({
			filePath,
			err
		}, "Warning: Exception parsing yarn.lock");
		return {
			isYarn1: true,
			lockedVersions: {}
		};
	}
}
function getZeroInstallPaths(yarnrcYml) {
	let conf;
	try {
		conf = parseSyml(yarnrcYml);
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, "Error parsing .yarnrc.yml");
	}
	const paths = [
		conf?.cacheFolder ?? "./.yarn/cache",
		".pnp.cjs",
		".pnp.js",
		".pnp.loader.mjs"
	];
	if (conf && miscUtils.tryParseOptionalBoolean(conf.pnpEnableInlining) === false) paths.push(conf.pnpDataPath ?? "./.pnp.data.json");
	return paths;
}
async function isZeroInstall(yarnrcYmlPath) {
	const yarnrcYml = await readLocalFile(yarnrcYmlPath, "utf8");
	// v8 ignore else -- TODO: add test #40625
	if (isString(yarnrcYml)) {
		const paths = getZeroInstallPaths(yarnrcYml);
		for (const p of paths) if (await localPathExists(getSiblingFileName(yarnrcYmlPath, p))) {
			logger.debug(`Detected Yarn zero-install in ${p}`);
			return true;
		}
	}
	return false;
}
function getYarnVersionFromLock(lockfile) {
	const { lockfileVersion, isYarn1 } = lockfile;
	if (isYarn1) return "^1.22.18";
	if (lockfileVersion && lockfileVersion >= 12) return ">=4.0.0";
	if (lockfileVersion && lockfileVersion >= 10) return "^4.0.0";
	if (lockfileVersion && lockfileVersion >= 8) return "^3.0.0";
	if (lockfileVersion && lockfileVersion >= 6) return "^2.2.0";
	return "^2.0.0";
}
async function extractYarnCatalogs(catalogs, packageFile, hasPackageManager) {
	logger.trace(`yarn.extractYarnCatalogs(${packageFile})`);
	const yarnCatalogs = yarnCatalogsToArray(catalogs);
	const deps = extractCatalogDeps(yarnCatalogs, "yarn");
	let yarnLock;
	const filePath = getSiblingFileName(packageFile, "yarn.lock");
	if (await localPathExists(filePath)) yarnLock = filePath;
	return {
		deps,
		managerData: {
			yarnLock,
			hasPackageManager
		}
	};
}
function yarnCatalogsToArray({ catalog: defaultCatalogDeps, catalogs: namedCatalogs }) {
	const result = [];
	if (defaultCatalogDeps !== void 0) result.push({
		name: "default",
		dependencies: defaultCatalogDeps
	});
	if (!namedCatalogs) return result;
	for (const [name, dependencies] of Object.entries(namedCatalogs)) result.push({
		name,
		dependencies
	});
	return result;
}
//#endregion
export { extractYarnCatalogs, getYarnLock, getYarnVersionFromLock, getZeroInstallPaths, isZeroInstall };

//# sourceMappingURL=yarn.js.map