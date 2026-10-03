import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/modules/manager/travis/extract.ts
function extractPackageFile(content, packageFile) {
	let doc;
	try {
		doc = parseSingleYaml(content);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Failed to parse .travis.yml file.");
		return null;
	}
	let deps = [];
	if (doc && isArray(doc.node_js)) deps = doc.node_js.map((currentValue) => ({
		depName: "node",
		datasource: NodeVersionDatasource.id,
		currentValue: currentValue.toString()
	}));
	let matrix_include;
	if (doc?.jobs?.include) matrix_include = doc.jobs.include;
	else if (doc?.matrix?.include) matrix_include = doc.matrix.include;
	if (!isArray(matrix_include)) return deps.length ? { deps } : null;
	for (const item of matrix_include) if (item?.node_js) {
		if (isArray(item.node_js)) item.node_js.forEach((currentValue) => {
			deps.push({
				depName: "node",
				datasource: NodeVersionDatasource.id,
				currentValue: currentValue.toString()
			});
		});
		else if (isString(item.node_js)) deps.push({
			depName: "node",
			datasource: NodeVersionDatasource.id,
			currentValue: item.node_js.toString()
		});
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map