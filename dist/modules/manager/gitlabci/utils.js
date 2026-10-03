import { regEx } from "../../../util/regex.js";
import { getDep } from "../dockerfile/extract.js";
//#region lib/modules/manager/gitlabci/utils.ts
const depProxyRe = regEx(`(?<prefix>\\$\\{?CI_DEPENDENCY_PROXY_(?:DIRECT_)?GROUP_IMAGE_PREFIX\\}?/)(?<depName>.+)`);
/**
* Get image dependencies respecting Gitlab Dependency Proxy
* @param imageName as used in .gitlab-ci.yml file
* @return package dependency for the image
*/
function getGitlabDep(imageName, registryAliases) {
	const match = depProxyRe.exec(imageName);
	if (match?.groups) {
		const dep = {
			...getDep(match.groups.depName),
			replaceString: imageName
		};
		dep.autoReplaceStringTemplate = `${match.groups.prefix}${dep.autoReplaceStringTemplate}`;
		return dep;
	}
	return getDep(imageName, true, registryAliases);
}
//#endregion
export { getGitlabDep };

//# sourceMappingURL=utils.js.map