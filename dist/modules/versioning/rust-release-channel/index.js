import { parse } from "./parse.js";
import { sortParsed } from "./util.js";
import { isNonEmptyString, isObject } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/modules/versioning/rust-release-channel/index.ts
const id = "rust-release-channel";
/** Rust 1.0.0 release date for major version calculation */
const rust1Date = DateTime.utc(2015, 5, 15);
var RustReleaseChannelVersioning = class {
	isValid(input) {
		return parse(input) !== null;
	}
	isVersion(input) {
		if (!isNonEmptyString(input)) return false;
		const parsed = parse(input);
		if (!parsed) return false;
		const { channel, date } = parsed;
		if (channel === "nightly") return date !== void 0;
		if (isObject(channel)) {
			if (channel.patch === void 0) return false;
			return !channel.prerelease || channel.prerelease.number !== void 0;
		}
		return false;
	}
	isSingleVersion(input) {
		return this.isVersion(input);
	}
	isStable(version) {
		const parsed = parse(version);
		if (!parsed) return false;
		const { channel } = parsed;
		if (!isObject(channel)) return false;
		if (channel.patch === void 0) return false;
		return !channel.prerelease;
	}
	isCompatible(version, current) {
		if (!current) return true;
		const parsedVersion = parse(version);
		const parsedCurrent = parse(current);
		if (!parsedVersion || !parsedCurrent) return false;
		if (parsedVersion.host !== parsedCurrent.host) return false;
		const channelVersion = parsedVersion.channel;
		const channelCurrent = parsedCurrent.channel;
		return channelVersion === "nightly" === (channelCurrent === "nightly");
	}
	getMajor(version) {
		const parsed = parse(version);
		if (!parsed) return null;
		const { channel, date } = parsed;
		if (channel === "nightly" && date) return DateTime.utc(date.year, date.month, date.day) >= rust1Date ? 1 : 0;
		if (isObject(channel)) return channel.major;
		return 1;
	}
	getMinor(version) {
		const parsed = parse(version);
		if (!parsed) return null;
		const { channel } = parsed;
		if (isObject(channel)) return channel.minor;
		return null;
	}
	getPatch(version) {
		const parsed = parse(version);
		if (!parsed) return null;
		const { channel } = parsed;
		if (isObject(channel)) return channel.patch ?? null;
		return null;
	}
	sortVersions(version, other) {
		const parsedA = parse(version);
		const parsedB = parse(other);
		if (!parsedA || !parsedB) return version.localeCompare(other);
		return sortParsed(parsedA, parsedB);
	}
	equals(version, other) {
		const parsedA = parse(version);
		const parsedB = parse(other);
		if (!parsedA || !parsedB) return false;
		return sortParsed(parsedA, parsedB) === 0;
	}
	isGreaterThan(version, other) {
		return this.sortVersions(version, other) > 0;
	}
	getSatisfyingVersion(versions, range) {
		const matching = versions.filter((version) => this.matches(version, range));
		if (matching.length === 0) return null;
		matching.sort((a, b) => this.sortVersions(a, b));
		return matching.at(-1);
	}
	minSatisfyingVersion(versions, range) {
		const matching = versions.filter((version) => this.matches(version, range));
		if (matching.length === 0) return null;
		matching.sort((a, b) => this.sortVersions(a, b));
		return matching[0];
	}
	getNewValue({ currentValue, rangeStrategy, newVersion }) {
		const parsedCurrent = parse(currentValue);
		const parsedNew = parse(newVersion);
		if (!parsedCurrent || !parsedNew) return null;
		const currentChannel = parsedCurrent.channel;
		const newChannel = parsedNew.channel;
		if (rangeStrategy === "pin") return newVersion;
		if (currentChannel === "nightly" && parsedCurrent.date) return newVersion;
		if (!isObject(currentChannel)) return currentValue;
		if (isObject(newChannel)) {
			if (currentChannel.patch === void 0) return `${newChannel.major}.${newChannel.minor}`;
			if (currentChannel.prerelease && currentChannel.prerelease.number === void 0) return `${newChannel.major}.${newChannel.minor}.${newChannel.patch ?? 0}-beta`;
		}
		return newVersion;
	}
	matches(version, range) {
		const parsedVersion = parse(version);
		const parsedRange = parse(range);
		if (!parsedVersion || !parsedRange) return false;
		const versionChannel = parsedVersion.channel;
		const rangeChannel = parsedRange.channel;
		if (rangeChannel === "nightly") return versionChannel === "nightly" && parsedVersion.date !== void 0;
		if (rangeChannel === "beta") return isObject(versionChannel) && versionChannel.prerelease?.name === "beta";
		if (rangeChannel === "stable") return isObject(versionChannel) && versionChannel.patch !== void 0 && !versionChannel.prerelease;
		if (isObject(rangeChannel) && isObject(versionChannel)) {
			if (versionChannel.major !== rangeChannel.major || versionChannel.minor !== rangeChannel.minor) return false;
			if (rangeChannel.patch === void 0) return true;
			if (versionChannel.patch !== rangeChannel.patch) return false;
			if (!rangeChannel.prerelease) return !versionChannel.prerelease;
			if (rangeChannel.prerelease.number === void 0) return !!versionChannel.prerelease;
			return !!versionChannel.prerelease && versionChannel.prerelease?.number === rangeChannel.prerelease.number;
		}
		return false;
	}
};
const api = new RustReleaseChannelVersioning();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map