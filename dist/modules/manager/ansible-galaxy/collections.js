import { regEx } from "../../../util/regex.js";
import { GalaxyCollectionDatasource } from "../../datasource/galaxy-collection/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { blockLineRegEx, galaxyDepRegex, nameMatchRegex, newBlockRegEx } from "./util.js";
//#region lib/modules/manager/ansible-galaxy/collections.ts
function interpretLine(lineMatch, dependency) {
	const localDependency = dependency;
	const key = lineMatch.groups.key;
	const value = lineMatch.groups.value.replace(regEx(/["']/g), "");
	switch (key) {
		case "name":
			localDependency.managerData.name = value;
			break;
		case "version":
			localDependency.managerData.version = value;
			localDependency.currentValue = value;
			break;
		case "source":
			localDependency.managerData.source = value;
			if (value?.startsWith("git@") || value?.endsWith(".git")) localDependency.packageName = value;
			else localDependency.registryUrls = value ? [value] : /* istanbul ignore next: should have test */ [];
			break;
		case "type":
			localDependency.managerData.type = value;
			break;
		default: localDependency.skipReason = "unsupported";
	}
}
function handleGitDep(dep, nameMatch) {
	dep.datasource = GitTagsDatasource.id;
	if (nameMatch?.groups) {
		if (nameMatch.groups.hostname === "github.com") dep.datasource = GithubTagsDatasource.id;
		else dep.datasource = GitTagsDatasource.id;
		const source = nameMatch.groups.source;
		const massagedDepName = nameMatch.groups.depName.replace(regEx(/.git$/), "");
		dep.depName = `${nameMatch.groups.hostname}/${massagedDepName}`;
		dep.packageName = source.replace(regEx(/git\+/), "");
		if (nameMatch.groups.version) dep.currentValue = nameMatch.groups.version;
		else dep.currentValue = dep.managerData.version;
	}
}
function handleGalaxyDep(dep) {
	dep.datasource = GalaxyCollectionDatasource.id;
	dep.depName = dep.managerData.name;
	dep.registryUrls = dep.managerData.source ? /* istanbul ignore next: should have test */ [dep.managerData.source] : [];
	dep.currentValue = dep.managerData.version;
}
function finalize(dependency) {
	const dep = dependency;
	dep.depName = dep.managerData.name;
	const name = dep.managerData.name;
	const nameMatch = nameMatchRegex.exec(name);
	switch (dependency.managerData.type) {
		case "galaxy":
			handleGalaxyDep(dep);
			break;
		case "git":
			handleGitDep(dep, nameMatch);
			break;
		case "file":
			dep.skipReason = "local-dependency";
			break;
		case null:
			if (nameMatch) {
				handleGitDep(dep, nameMatch);
				break;
			}
			if (galaxyDepRegex.exec(dep.managerData.name)) {
				dep.datasource = GalaxyCollectionDatasource.id;
				dep.depName = dep.managerData.name;
				break;
			}
			dep.skipReason = "no-source-match";
			break;
		default:
			dep.skipReason = "unsupported";
			return;
	}
	if (!dependency.currentValue && !dep.skipReason) dep.skipReason = "unspecified-version";
}
function extractCollections(lines) {
	const deps = [];
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
		let lineMatch = newBlockRegEx.exec(lines[lineNumber]);
		if (lineMatch) {
			const dep = {
				depType: "galaxy-collection",
				managerData: {
					name: null,
					version: null,
					type: null,
					source: null
				}
			};
			do {
				interpretLine(lineMatch, dep);
				const line = lines[lineNumber + 1];
				if (!line) break;
				lineMatch = blockLineRegEx.exec(line);
				if (lineMatch) lineNumber += 1;
			} while (lineMatch);
			finalize(dep);
			delete dep.managerData;
			deps.push(dep);
		}
	}
	return deps;
}
//#endregion
export { extractCollections };

//# sourceMappingURL=collections.js.map