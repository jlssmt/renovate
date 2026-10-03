import { logger } from "../../../logger/index.js";
import { Json } from "../../../util/schema-utils/index.js";
import { FlutterVersionDatasource } from "../../datasource/flutter-version/index.js";
import { FvmConfig } from "./schema.js";
//#region lib/modules/manager/fvm/extract.ts
function extractPackageFile(content, packageFile) {
	let flutterVersion;
	try {
		const config = Json.pipe(FvmConfig).parse(content);
		flutterVersion = config.flutter ?? config.flutterSdkVersion;
		if (!flutterVersion) {
			logger.debug({ contents: config }, "FVM config does not have a flutter version specified");
			return null;
		}
	} catch (err) {
		logger.debug({
			packageFile,
			err
		}, "Invalid FVM config");
		return null;
	}
	return { deps: [{
		depName: "flutter",
		currentValue: flutterVersion,
		datasource: FlutterVersionDatasource.id,
		packageName: "flutter/flutter"
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map