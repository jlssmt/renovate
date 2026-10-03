import { regEx } from "../../../util/regex.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { getDep } from "../dockerfile/extract.js";
//#region lib/modules/manager/bitbucket-pipelines/util.ts
const pipeRegex = regEx(`^\\s*-\\s?pipe:\\s*'?"?([^\\s'"]+)'?"?\\s*$`);
const dockerImageRegex = regEx(`^\\s*-?\\s?image:\\s*'?"?([^\\s'"]+)'?"?\\s*$`);
const dockerImageObjectRegex = regEx("^(?<spaces>\\s*)image:\\s*$");
function addDepAsBitbucketTag(deps, pipe) {
	const [depName, currentValue] = pipe.split(":");
	const dep = {
		depName,
		currentValue,
		datasource: BitbucketTagsDatasource.id
	};
	dep.depType = "bitbucket-tags";
	deps.push(dep);
}
function addDepAsDockerImage(deps, currentDockerImage, registryAliases) {
	const dep = getDep(currentDockerImage, true, registryAliases);
	dep.depType = "docker";
	deps.push(dep);
}
function addDepFromObject(deps, lines, start, len, spaces, registryAliases) {
	const nameRegex = regEx(`^${spaces}\\s+name:\\s*['"]?(?<image>[^\\s'"]+)['"]?\\s*$`);
	const indentRegex = regEx(`^${spaces}\\s+`);
	for (let idx = start + 1; idx < len; idx++) {
		const line = lines[idx];
		if (!indentRegex.test(line)) return idx;
		const groups = nameRegex.exec(line)?.groups;
		if (groups) {
			const dep = getDep(groups.image, true, registryAliases);
			dep.depType = "docker";
			deps.push(dep);
			return idx;
		}
	}
	return start;
}
//#endregion
export { addDepAsBitbucketTag, addDepAsDockerImage, addDepFromObject, dockerImageObjectRegex, dockerImageRegex, pipeRegex };

//# sourceMappingURL=util.js.map