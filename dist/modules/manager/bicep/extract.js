import { newlineRegex, regEx } from "../../../util/regex.js";
import { AzureBicepResourceDatasource } from "../../datasource/azure-bicep-resource/index.js";
//#region lib/modules/manager/bicep/extract.ts
const RESOURCE_REGEX = regEx(/resource\s+[A-Za-z0-9_]+\s+(?<replaceString>'(?<depName>.+\..+\/.+)@(?<currentValue>.+?)')/);
function extractPackageFile(content, _packageFile, _config) {
	const deps = [];
	for (const line of content.split(newlineRegex)) {
		const trimmedLine = line?.trim();
		if (!trimmedLine || trimmedLine.startsWith("//")) continue;
		const match = RESOURCE_REGEX.exec(trimmedLine);
		if (!match?.groups) continue;
		const { depName, currentValue, replaceString } = match.groups;
		deps.push({
			datasource: AzureBicepResourceDatasource.id,
			versioning: "azure-rest-api",
			depName,
			currentValue,
			autoReplaceStringTemplate: "'{{depName}}@{{newValue}}'",
			replaceString
		});
	}
	return Promise.resolve(deps.length ? { deps } : null);
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map