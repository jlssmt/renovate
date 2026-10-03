import { regEx } from "../../util/regex.js";
import data from "../../data-files.generated.js";
import { DateTime } from "luxon";
//#region lib/modules/versioning/distro.ts
const delay = 1;
var DistroInfo = class {
	_codenameToVersion = /* @__PURE__ */ new Map();
	_sortedInfo = [];
	_distroInfo;
	constructor(distroJsonKey) {
		this._distroInfo = JSON.parse(data.get(distroJsonKey).replace(regEx(/v(?<version>[\d.]+)\b/gm), "$<version>"));
		for (const version of Object.keys(this._distroInfo)) {
			const schedule = this._distroInfo[version];
			this._codenameToVersion.set(schedule.series, {
				version,
				...schedule
			});
		}
		const arr = Object.keys(this._distroInfo).sort((a, b) => parseFloat(a) - parseFloat(b));
		for (const v of arr) {
			const obj = {
				version: v,
				...this._distroInfo[v.toString()]
			};
			if (!obj.release)
 // istanbul ignore next
			continue;
			this._sortedInfo.push(obj);
		}
	}
	/**
	* Check if input is a valid release codename
	* @param input A codename
	* @returns true if input is a codename, false otherwise
	*/
	isCodename(input) {
		return this._codenameToVersion.has(input);
	}
	/**
	* Checks if given input string is a valid release version
	* @param input A codename/semVer
	* @returns true if release exists, false otherwise
	*/
	exists(input) {
		const ver = this.getVersionByCodename(input);
		return !!this._distroInfo[ver];
	}
	/**
	* Get semVer representation of a given codename
	* @param input A codename
	* @returns A semVer if exists, otherwise input string is returned
	*/
	getVersionByCodename(input) {
		const schedule = this._codenameToVersion.get(input);
		if (schedule) return schedule.version;
		return input;
	}
	/**
	* Get codename representation of a given semVer
	* @param input A semVer
	* @returns A codename if exists, otherwise input string is returned
	*/
	getCodenameByVersion(input) {
		const di = this._distroInfo[input];
		if (di) return di.series;
		// istanbul ignore next
		return input;
	}
	/**
	* Get schedule of a given release
	* @param input A codename/semVer
	* @returns A schedule if available, otherwise undefined
	*/
	getSchedule(input) {
		const ver = this.getVersionByCodename(input);
		return this._distroInfo[ver] ?? null;
	}
	/**
	* Check if a given release has passed its EOL
	* @param input A codename/semVer
	* @returns false if still supported, true otherwise
	*/
	isEolLts(input) {
		const ver = this.getVersionByCodename(input);
		const schedule = this.getSchedule(ver);
		const endLts = schedule?.eol ?? null;
		let end = schedule?.eol_lts ?? null;
		end ??= endLts;
		if (end) {
			const now = DateTime.now().toUTC();
			return DateTime.fromISO(end, { zone: "utc" }) < now;
		}
		return true;
	}
	/**
	* Check if a given version has been released
	* @param input A codename/semVer
	* @returns false if unreleased or has no schedule, true otherwise
	*/
	isReleased(input) {
		const ver = this.getVersionByCodename(input);
		const schedule = this.getSchedule(ver);
		if (!schedule?.release) return false;
		const now = DateTime.now().minus({ day: delay }).toUTC();
		return DateTime.fromISO(schedule.release, { zone: "utc" }) < now;
	}
	/**
	* Check if a given version has been created
	* @param input A codename/semVer
	* @returns false if unreleased or has no schedule, true otherwise
	*/
	isCreated(input) {
		const ver = this.getVersionByCodename(input);
		const schedule = this.getSchedule(ver);
		if (!schedule) return false;
		const now = DateTime.now().minus({ day: delay }).toUTC();
		return DateTime.fromISO(schedule.created, { zone: "utc" }) < now;
	}
	/**
	* Get distro info for the release that has N other newer releases.
	* Example: n=0 corresponds to the latest available release, n=1 the release before, etc.
	* In Debian terms: N = 0 -> stable, N = 1 -> oldstable, N = 2 -> oldoldstalbe
	* @param n
	* @returns Distro info of the Nth latest release
	*/
	getNLatest(n) {
		const len = this._sortedInfo.length - 1;
		let idx = -1;
		if (n < 0) return null;
		for (let i = len; i >= 0; i--) if (this.isReleased(this._sortedInfo[i].version)) {
			idx = i - Math.floor(n);
			break;
		}
		if (idx > len || idx < 0) return null;
		return this._sortedInfo[idx];
	}
};
//#endregion
export { DistroInfo };

//# sourceMappingURL=distro.js.map