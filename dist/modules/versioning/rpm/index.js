import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { GenericVersioningApi } from "../generic.js";
import { isNumericString } from "@sindresorhus/is";
const alphaNumPattern = regEx(/(?:[a-zA-Z]+)|(?:\d+)|(?:~)/g);
const epochPattern = regEx(/^\d+$/);
var RpmVersioningApi = class extends GenericVersioningApi {
	/**
	* https://github.com/rpm-software-management/rpm/blob/e3c11a790367016aed7ea48cfcc78751a71ce862/rpmio/rpmvercmp.c#L16
	*/
	_parse(version) {
		let remainingVersion = version;
		let epoch = 0;
		const epochIndex = remainingVersion.indexOf(":");
		if (epochIndex !== -1) {
			const epochStr = remainingVersion.slice(0, epochIndex);
			if (epochPattern.test(epochStr)) epoch = parseInt(epochStr, 10);
			else return null;
			remainingVersion = remainingVersion.slice(epochIndex + 1);
		}
		let upstreamVersion;
		let rpmRelease = "";
		let rpmPreRelease = "";
		let snapshot = "";
		const releaseIndex = remainingVersion.indexOf("-");
		const prereleaseIndex = remainingVersion.indexOf("~");
		const snapshotIndex = remainingVersion.indexOf("^");
		if (releaseIndex >= 0) {
			upstreamVersion = remainingVersion.slice(0, releaseIndex);
			if (prereleaseIndex >= 0) {
				rpmRelease = remainingVersion.slice(releaseIndex, prereleaseIndex);
				if (snapshotIndex >= 0) {
					rpmPreRelease = remainingVersion.slice(prereleaseIndex, snapshotIndex);
					snapshot = remainingVersion.slice(snapshotIndex + 1);
				} else rpmPreRelease = remainingVersion.slice(prereleaseIndex);
			} else rpmRelease = remainingVersion.slice(releaseIndex + 1);
		} else upstreamVersion = remainingVersion;
		const release = [...remainingVersion.matchAll(regEx(/\d+/g))].map((m) => parseInt(m[0], 10));
		return {
			epoch,
			upstreamVersion,
			rpmRelease,
			release,
			rpmPreRelease,
			snapshot
		};
	}
	_compare_string(s1, s2) {
		if (s1 === s2) return 0;
		const minLength = Math.min(s1.length, s2.length);
		for (let i = 0; i < minLength; i++) {
			const c1 = s1[i];
			const c2 = s2[i];
			if (c1 === c2) continue;
			return c1 > c2 ? 1 : -1;
		}
		return s1.length > s2.length ? 1 : -1;
	}
	/**
	* Taken from https://github.com/rpm-software-management/rpm/blob/master/rpmio/rpmvercmp.c
	*/
	_compare_glob(v1, v2) {
		if (v1 === v2) return 0;
		const matchesv1 = coerceArray(v1.match(alphaNumPattern));
		const matchesv2 = coerceArray(v2.match(alphaNumPattern));
		const matches = Math.min(matchesv1.length, matchesv2.length);
		for (let i = 0; i < matches; i++) {
			const matchv1 = matchesv1[i];
			const matchv2 = matchesv2[i];
			if (matchv1?.startsWith("~") || matchv2?.startsWith("~")) {
				if (!matchv1?.startsWith("~")) return 1;
				if (!matchv2?.startsWith("~")) return -1;
			}
			if (isNumericString(matchv1?.[0])) {
				if (!isNumericString(matchv2?.[0])) return 1;
				const result = matchv1.localeCompare(matchv2, void 0, { numeric: true });
				if (result === 0) continue;
				return Math.sign(result);
			}
			if (isNumericString(matchv2?.[0])) return -1;
			const compared_value = this._compare_string(matchv1, matchv2);
			if (compared_value !== 0) return compared_value;
		}
		if (matchesv1.length === matchesv2.length) return 0;
		if (matchesv1.length > matches && matchesv1[matches].startsWith("~")) return -1;
		if (matchesv2.length > matches && matchesv2[matches].startsWith("~")) return 1;
		return matchesv1.length > matchesv2.length ? 1 : -1;
	}
	_compare(version, other) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(other);
		if (!(parsed1 && parsed2)) return 1;
		if (parsed1.epoch !== parsed2.epoch) return Math.sign(parsed1.epoch - parsed2.epoch);
		const upstreamVersionDifference = this._compare_glob(parsed1.upstreamVersion, parsed2.upstreamVersion);
		if (upstreamVersionDifference !== 0) return upstreamVersionDifference;
		const releaseVersionDifference = this._compare_glob(parsed1.rpmRelease, parsed2.rpmRelease);
		if (releaseVersionDifference !== 0) return releaseVersionDifference;
		if (parsed1.rpmPreRelease === "" && parsed2.rpmPreRelease !== "") return 1;
		if (parsed1.rpmPreRelease !== "" && parsed2.rpmPreRelease === "") return -1;
		if (this._compare_glob(parsed1.rpmPreRelease, parsed2.rpmPreRelease) !== 0) return releaseVersionDifference;
		return this._compare_glob(parsed1.snapshot, parsed2.snapshot);
	}
};
const api = new RpmVersioningApi();
//#endregion
export { api, api as default };

//# sourceMappingURL=index.js.map