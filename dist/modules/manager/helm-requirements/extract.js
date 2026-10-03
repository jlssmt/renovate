import { coerceObject } from "../../../util/object.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { isAlias, parseRepository, resolveAlias } from "../helmv3/utils.js";
import { isArray } from "@sindresorhus/is";
//#region lib/modules/manager/helm-requirements/extract.ts
function extractPackageFile(content, packageFile, config) {
	let deps = [];
	let doc;
	try {
		doc = parseSingleYaml(content);
	} catch {
		logger.debug({ packageFile }, `Failed to parse helm requirements.yaml`);
		return null;
	}
	if (!(doc && isArray(doc.dependencies))) {
		logger.debug({ packageFile }, `requirements.yaml has no dependencies`);
		return null;
	}
	deps = doc.dependencies.map((dep) => {
		let currentValue;
		switch (typeof dep.version) {
			case "number":
				currentValue = String(dep.version);
				break;
			case "string": currentValue = dep.version;
		}
		const res = {
			depName: dep.name,
			currentValue
		};
		if (!res.depName) {
			res.skipReason = "invalid-name";
			return res;
		}
		if (!res.currentValue) {
			res.skipReason = "invalid-version";
			return res;
		}
		if (!dep.repository) {
			res.skipReason = "no-repository";
			return res;
		}
		res.registryUrls = [dep.repository];
		if (isAlias(dep.repository)) {
			const repository = resolveAlias(dep.repository, coerceObject(config.registryAliases));
			if (!repository) {
				res.skipReason = "placeholder-url";
				return res;
			}
			res.registryUrls = [repository];
			return res;
		}
		return {
			...res,
			...parseRepository(dep.name, dep.repository)
		};
	});
	return {
		deps,
		datasource: HelmDatasource.id
	};
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map