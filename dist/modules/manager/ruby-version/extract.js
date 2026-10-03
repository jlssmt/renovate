import { logger } from "../../../logger/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
//#region lib/modules/manager/ruby-version/extract.ts
function extractPackageFile(content) {
	logger.trace("ruby-version.extractPackageFile()");
	return { deps: [{
		depName: "ruby",
		currentValue: content.trim(),
		datasource: RubyVersionDatasource.id
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map