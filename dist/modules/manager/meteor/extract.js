import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
//#region lib/modules/manager/meteor/extract.ts
function extractPackageFile(content, packageFile) {
	let deps = [];
	const npmDepends = regEx(/\nNpm\.depends\({(?<body>[\s\S]*?)}\);/).exec(content);
	if (!npmDepends) return null;
	try {
		deps = npmDepends.groups.body.replace(regEx(/(?:\s|\\n|\\t|'|")/g), "").split(",").map((dep) => dep.trim()).filter((dep) => dep.length).map((dep) => dep.split(regEx(/:(?<value>.*)/))).map((arr) => {
			const [depName, currentValue] = arr;
			// istanbul ignore if
			if (!(depName && currentValue)) logger.warn({ content }, "Incomplete npm.depends match");
			return {
				depName,
				currentValue,
				datasource: NpmDatasource.id
			};
		}).filter((dep) => dep.depName && dep.currentValue);
	} catch (err) /* istanbul ignore next */ {
		logger.warn({
			err,
			packageFile
		}, "Failed to parse meteor package.js");
	}
	// istanbul ignore if
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map