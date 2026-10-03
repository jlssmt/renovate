import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/perl/index.ts
const id = "perl";
const decimalVersionPattern = regEx(/^(?<intPart>\d+)\.(?<decimalPart>\d+(?:_\d+)?)$/);
const dottedDecimalVersionPattern = regEx(/^v?(?<versionValue>\d+(?:\.\d+)*(?:_\d+)?)$/);
var PerlVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		return this._parseDecimalVersion(version) ?? this._parseDottedDecimalVersion(version);
	}
	_parseDecimalVersion(version) {
		const matches = decimalVersionPattern.exec(version);
		if (!matches) return null;
		const { intPart, decimalPart } = matches.groups;
		const prerelease = decimalPart.includes("_") ? "alpha" : "";
		const decimalComponents = coerceArray(decimalPart.replace(regEx(/_/g), "").match(regEx(/.{1,3}/g))?.map((value) => {
			let component = value;
			while (component.length < 3) component += "0";
			return Number.parseInt(component, 10);
		}));
		return {
			release: [Number.parseInt(intPart, 10), ...decimalComponents],
			prerelease
		};
	}
	_parseDottedDecimalVersion(version) {
		const matches = dottedDecimalVersionPattern.exec(version);
		if (!matches) return null;
		const { versionValue } = matches.groups;
		const prerelease = versionValue.includes("_") ? "alpha" : "";
		return {
			release: versionValue.split(regEx(/[._]/)).map(Number),
			prerelease
		};
	}
};
const api = new PerlVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map