import { parseYaml } from "../../../util/yaml.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { GlasskubePackagesDatasource } from "../../datasource/glasskube-packages/index.js";
import { GlasskubeResource } from "./schema.js";
import { isFalsy } from "@sindresorhus/is";
//#region lib/modules/manager/glasskube/extract.ts
function parseResources(content, packageFile) {
	const resources = parseYaml(content, {
		customSchema: GlasskubeResource,
		failureBehaviour: "filter"
	});
	const packages = [];
	const repositories = [];
	for (const resource of resources) if (resource.kind === "PackageRepository") repositories.push(resource);
	else packages.push(resource);
	return {
		packageFile,
		repositories,
		packages
	};
}
function resolvePackageDependencies(packages, repositories) {
	const deps = [];
	for (const pkg of packages) {
		const dep = {
			depName: pkg.spec.packageInfo.name,
			currentValue: pkg.spec.packageInfo.version,
			datasource: GlasskubePackagesDatasource.id
		};
		const repository = findRepository(pkg.spec.packageInfo.repositoryName ?? null, repositories);
		if (repository === null) dep.skipReason = "unknown-registry";
		else dep.registryUrls = [repository.spec.url];
		deps.push(dep);
	}
	return deps;
}
function findRepository(name, repositories) {
	for (const repository of repositories) {
		if (name === repository.metadata.name) return repository;
		// v8 ignore else -- needs a manifest whose repositories match no name
		if (isFalsy(name) && isDefaultRepository(repository)) return repository;
	}
	return null;
}
function isDefaultRepository(repository) {
	return repository.metadata.annotations?.["packages.glasskube.dev/default-repository"] === "true";
}
function extractPackageFile(content, packageFile, _config) {
	const { packages, repositories } = parseResources(content, packageFile);
	return { deps: resolvePackageDependencies(packages, repositories) };
}
async function extractAllPackageFiles(_config, packageFiles) {
	const allRepositories = [];
	const glasskubeResourceFiles = [];
	for (const packageFile of packageFiles) {
		const content = await readLocalFile(packageFile, "utf8");
		// v8 ignore else -- needs a listed package file that cannot be read
		if (content !== null) {
			const resources = parseResources(content, packageFile);
			allRepositories.push(...resources.repositories);
			glasskubeResourceFiles.push(resources);
		}
	}
	const result = [];
	for (const file of glasskubeResourceFiles) {
		const deps = resolvePackageDependencies(file.packages, allRepositories);
		if (deps.length > 0) result.push({
			packageFile: file.packageFile,
			deps
		});
	}
	return result.length ? result : null;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=extract.js.map