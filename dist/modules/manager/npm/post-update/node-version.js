import { newlineRegex, regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { resolveToolConstraint } from "../../util.js";
import upath from "upath";
import semver from "semver";
//#region lib/modules/manager/npm/post-update/node-version.ts
async function getNodeFile(filename) {
	try {
		const constraint = (await readLocalFile(filename, "utf8")).split(newlineRegex)[0].replace(regEx(/^v/), "");
		if (semver.validRange(constraint)) {
			logger.debug(`Using node constraint "${constraint}" from ${filename}`);
			return constraint;
		}
	} catch {}
	return null;
}
async function getPackageJsonConstraint(pkg) {
	const pkgJson = await pkg.getValue();
	if (pkgJson.volta?.node) {
		const constraint = pkgJson.volta.node;
		// v8 ignore else -- TODO: add test #40625
		if (semver.validRange(constraint)) {
			logger.debug(`Using node constraint "${constraint}" from package.json volta`);
			return constraint;
		}
	}
	if (pkgJson.engines?.node) {
		const constraint = pkgJson.engines.node;
		// v8 ignore else -- TODO: add test #40625
		if (semver.validRange(constraint)) {
			logger.debug(`Using node constraint "${constraint}" from package.json engines`);
			return constraint;
		}
	}
	return null;
}
async function getNodeConstraint(config, upgrades, lockFileDir, pkg) {
	const constraint = getNodeUpdate(upgrades) ?? await resolveToolConstraint(config, "node", async () => await getNodeFile(upath.join(lockFileDir, ".nvmrc")) ?? await getNodeFile(upath.join(lockFileDir, ".node-version")) ?? await getPackageJsonConstraint(pkg)) ?? null;
	if (!constraint) logger.debug("No node constraint found - using latest");
	return constraint;
}
function getNodeUpdate(upgrades) {
	return upgrades.find((u) => u.depName === "node")?.newValue;
}
async function getNodeToolConstraint(config, upgrades, lockFileDir, pkg) {
	return {
		toolName: "node",
		constraint: await getNodeConstraint(config, upgrades, lockFileDir, pkg)
	};
}
//#endregion
export { getNodeConstraint, getNodeToolConstraint, getNodeUpdate };

//# sourceMappingURL=node-version.js.map