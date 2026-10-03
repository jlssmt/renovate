import { CONFIG_VALIDATION } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
import { parseRange, satisfiesComparator } from "../generic-range.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/modules/versioning/regex/index.ts
const id = "regex";
var RegExpVersioningApi = class extends GenericVersioningApi {
	_config;
	constructor(_new_config) {
		super();
		const new_config = _new_config ?? "^(?<major>\\d+)?$";
		if (!new_config.includes("<major>") && !new_config.includes("<minor>") && !new_config.includes("<patch>")) {
			const error = new Error(CONFIG_VALIDATION);
			error.validationSource = new_config;
			error.validationError = "regex versioning needs at least one major, minor or patch group defined";
			throw error;
		}
		this._config = regEx(new_config);
	}
	_parse(version) {
		const groups = this._config?.exec(version)?.groups;
		if (!groups) return null;
		const { major, minor, patch, build, revision, prerelease, compatibility } = groups;
		const release = [
			isUndefined(major) ? 0 : Number.parseInt(major, 10),
			isUndefined(minor) ? 0 : Number.parseInt(minor, 10),
			isUndefined(patch) ? 0 : Number.parseInt(patch, 10)
		];
		if (build) {
			release.push(Number.parseInt(build, 10));
			if (revision) release.push(Number.parseInt(revision, 10));
		}
		return {
			release,
			prerelease,
			compatibility
		};
	}
	isCompatible(version, current) {
		const parsedVersion = this._parse(version);
		const parsedCurrent = this._parse(current);
		return !!(parsedVersion && parsedVersion.compatibility === parsedCurrent?.compatibility);
	}
	isValid(input) {
		return this.isVersion(input) || parseRange(input, (v) => this.isVersion(v)) !== null;
	}
	isVersion(version) {
		return this._parse(version) !== null;
	}
	isSingleVersion(input) {
		const range = parseRange(input, (v) => this.isVersion(v));
		if (range) return range.length === 1 && (range[0].operator === "=" || range[0].operator === "==");
		return this.isVersion(input);
	}
	matches(version, range) {
		const comparators = parseRange(range, (v) => this.isVersion(v));
		if (!comparators) return this.equals(version, range);
		return comparators.every((comparator) => satisfiesComparator(this._compare(version, comparator.version), comparator.operator));
	}
	getSatisfyingVersion(versions, range) {
		if (parseRange(range, (v) => this.isVersion(v)) === null) return super.getSatisfyingVersion(versions, range);
		const matching = versions.filter((v) => this.matches(v, range));
		matching.sort((a, b) => this._compare(a, b));
		return matching.at(-1) ?? null;
	}
	minSatisfyingVersion(versions, range) {
		if (parseRange(range, (v) => this.isVersion(v)) === null) return super.minSatisfyingVersion(versions, range);
		const matching = versions.filter((v) => this.matches(v, range));
		matching.sort((a, b) => this._compare(a, b));
		return matching.at(0) ?? null;
	}
};
const api = RegExpVersioningApi;
//#endregion
export { RegExpVersioningApi, api, api as default, id };

//# sourceMappingURL=index.js.map