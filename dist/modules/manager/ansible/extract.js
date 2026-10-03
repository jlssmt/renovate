import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getDep } from "../dockerfile/extract.js";
//#region lib/modules/manager/ansible/extract.ts
function extractPackageFile(content, packageFile, config) {
	logger.trace(`ansible.extractPackageFile(${packageFile})`);
	let deps = [];
	const re = regEx(/^\s*image:\s*'?"?(?<image>[^\s'"]+)'?"?\s*$/);
	for (const line of content.split(newlineRegex)) {
		const match = re.exec(line);
		if (match) {
			const currentFrom = match.groups.image;
			const dep = getDep(currentFrom, true, config.registryAliases);
			logger.debug({
				depName: dep.depName,
				currentValue: dep.currentValue,
				currentDigest: dep.currentDigest
			}, "Docker image inside ansible");
			deps.push(dep);
		}
	}
	deps = deps.filter((dep) => !dep.currentValue?.includes("${"));
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map