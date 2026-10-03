import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { parseYaml } from "../../../util/yaml.js";
import { GitlabDocumentArray } from "./schema.js";
//#region lib/modules/manager/gitlabci-include/extract.ts
function extractPackageFile(content, packageFile) {
	const deps = [];
	const platform = GlobalConfig.get("platform");
	const endpoint = GlobalConfig.get("endpoint");
	const registryUrls = platform === "gitlab" && endpoint ? [endpoint.replace(regEx(/\/api\/v4\/?/), "")] : null;
	try {
		const docs = parseYaml(content, { uniqueKeys: false });
		for (const dep of GitlabDocumentArray.parse(docs)) {
			if (registryUrls) dep.registryUrls = registryUrls;
			deps.push(dep);
		}
	} catch (err) /* istanbul ignore next */ {
		if (err.stack?.startsWith("YAMLException:")) logger.debug({
			err,
			packageFile
		}, "YAML exception extracting GitLab CI includes");
		else logger.debug({
			err,
			packageFile
		}, "Error extracting GitLab CI includes");
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map