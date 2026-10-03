import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/azure-rest-api/index.ts
const id = "azure-rest-api";
const AZURE_REST_API_VERSION_REGEX = regEx(/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?<prerelease>-[a-z]+)?$/);
var AzureRestApiVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		if (!version) return null;
		const matchGroups = AZURE_REST_API_VERSION_REGEX.exec(version)?.groups;
		if (!matchGroups) return null;
		const { year, month, day, prerelease } = matchGroups;
		return {
			release: [
				parseInt(`${year}${month}${day}`, 10),
				0,
				0
			],
			prerelease
		};
	}
	_compare(_version, _other) {
		if (_version === _other) return 0;
		return _version > _other ? 1 : -1;
	}
};
const api = new AzureRestApiVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map