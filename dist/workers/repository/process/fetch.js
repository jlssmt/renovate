import { logger } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { LookupStats } from "../../../util/stats.js";
import { instrument } from "../../../instrumentation/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { Result } from "../../../util/result.js";
import { all } from "../../../util/promises.js";
import { getDefaultVersioning } from "../../../modules/datasource/common.js";
import { getDefaultConfig } from "../../../modules/datasource/index.js";
import { getManagerConfig } from "../../../config/index.js";
import { PackageFiles } from "../package-files.js";
import { applyPackageRules } from "../../../util/package-rules/index.js";
import { lookupUpdates } from "./lookup/index.js";
import { isNonEmptyArray, isNonEmptyString, isString } from "@sindresorhus/is";
//#region lib/workers/repository/process/fetch.ts
async function lookup(packageFileConfig, indep) {
	const dep = clone(indep);
	dep.updates = [];
	if (isString(dep.depName)) dep.depName = dep.depName.trim();
	dep.packageName ??= dep.depName;
	const mayBeGivenARegistry = dep.skipReason === "unknown-registry" && !isNonEmptyArray(dep.registryUrls);
	if (dep.skipReason && !mayBeGivenARegistry) return Result.ok(dep);
	if (!isNonEmptyString(dep.packageName)) {
		dep.skipReason = "invalid-name";
		return Result.ok(dep);
	}
	if (dep.isInternal && !packageFileConfig.updateInternalDeps) {
		dep.skipReason = "internal-package";
		return Result.ok(dep);
	}
	const { depName } = dep;
	let depConfig = mergeChildConfig(packageFileConfig, dep);
	if (dep.extractedConstraints) depConfig.constraints = {
		...dep.extractedConstraints,
		...depConfig.constraints
	};
	const datasourceDefaultConfig = await getDefaultConfig(depConfig.datasource);
	depConfig = mergeChildConfig(depConfig, datasourceDefaultConfig);
	depConfig.versioning ??= getDefaultVersioning(depConfig.datasource);
	depConfig = await applyPackageRules(depConfig, "pre-lookup");
	depConfig.packageName ??= depConfig.depName;
	if (mayBeGivenARegistry) {
		if (depConfig.skipReason === "unknown-registry") {
			logger.debug(`Dependency: ${depName}, has no registry to be looked up in - set registryUrls to say which one to use`);
			return Result.ok(dep);
		}
		delete dep.skipReason;
		delete dep.skipStage;
	}
	if (depConfig.ignoreDeps.includes(depName)) {
		logger.debug(`Dependency: ${depName}, is ignored`);
		dep.skipReason = "ignored";
		return Result.ok(dep);
	}
	if (depConfig.enabled === false) {
		logger.debug(`Dependency: ${depName}, is disabled`);
		dep.skipReason = "disabled";
		return Result.ok(dep);
	}
	if (!depConfig.datasource) return Result.ok(dep);
	return LookupStats.wrap(depConfig.datasource, async () => {
		const { packageFile, manager } = packageFileConfig;
		return await Result.wrap(lookupUpdates(depConfig)).onValue((dep) => {
			logger.trace({
				dep,
				packageFile,
				manager
			}, "Dependency lookup success");
		}).onError((err) => {
			logger.trace({
				err,
				depName,
				packageFile,
				manager
			}, "Dependency lookup error");
		}).catch((err) => {
			if (packageFileConfig.repoIsOnboarded === true || !(err instanceof ExternalHostError)) return Result.err(err);
			const cause = err.err;
			return Result.ok({
				updates: [],
				warnings: [{
					topic: "Lookup Error",
					message: `${depName}: ${cause.message}`
				}]
			});
		}).transform((upd) => Object.assign(dep, upd));
	});
}
async function fetchManagerPackagerFileUpdates(config, managerConfig, pFile) {
	const { packageFile } = pFile;
	const packageFileConfig = mergeChildConfig(managerConfig, pFile);
	if (pFile.extractedConstraints) packageFileConfig.constraints = {
		...pFile.extractedConstraints,
		...config.constraints
	};
	const mergedConstraintsVersioning = {
		...pFile.constraintsVersioning,
		...config.constraintsVersioning
	};
	if (Object.keys(mergedConstraintsVersioning).length > 0) packageFileConfig.constraintsVersioning = mergedConstraintsVersioning;
	const { manager } = packageFileConfig;
	const queue = pFile.deps.map((dep) => async () => {
		return (await lookup(packageFileConfig, dep)).unwrapOrThrow();
	});
	logger.trace({
		manager,
		packageFile,
		queueLength: queue.length
	}, "fetchManagerPackagerFileUpdates starting with concurrency");
	pFile.deps = await all(queue);
	logger.trace({
		manager,
		packageFile
	}, "fetchManagerPackagerFileUpdates finished");
}
async function fetchManagerUpdates(config, packageFiles, manager) {
	const managerConfig = getManagerConfig(config, manager);
	const queue = packageFiles[manager].map((pFile) => () => fetchManagerPackagerFileUpdates(config, managerConfig, pFile));
	logger.trace({
		manager,
		queueLength: queue.length
	}, "fetchManagerUpdates starting");
	await all(queue);
	logger.trace({ manager }, "fetchManagerUpdates finished");
}
async function fetchUpdates(config, packageFiles) {
	const allManagerJobs = Object.keys(packageFiles).map((manager) => instrument(manager, () => fetchManagerUpdates(config, packageFiles, manager)));
	await Promise.all(allManagerJobs);
	PackageFiles.add(config.baseBranch, { ...packageFiles });
	logger.debug({ baseBranch: config.baseBranch }, "Package releases lookups complete");
}
//#endregion
export { fetchUpdates };

//# sourceMappingURL=fetch.js.map