import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { DateTime } from "luxon";
//#region lib/modules/versioning/debian/common.ts
const refreshInterval = { days: 1 };
const datedRegex = regEx(/^(?<codename>\w+)-(?<date>\d{8})(?<suffix>\.\d{1,2})?$/);
function isDatedCodeName(input, distroInfo) {
	const match = datedRegex.exec(input);
	if (!match?.groups) return false;
	const codename = match.groups.codename;
	return distroInfo.isCodename(codename);
}
function getDatedContainerImageCodename(version) {
	const match = datedRegex.exec(version);
	if (!match?.groups) return null;
	return match.groups.codename;
}
function getDatedContainerImageVersion(version) {
	const match = datedRegex.exec(version);
	if (!match?.groups) return null;
	return parseInt(match.groups.date, 10);
}
function getDatedContainerImageSuffix(version) {
	const match = datedRegex.exec(version);
	if (!match?.groups?.suffix) return null;
	return match.groups.suffix;
}
var RollingReleasesData = class {
	ltsToVer = /* @__PURE__ */ new Map();
	verToLts = /* @__PURE__ */ new Map();
	timestamp = DateTime.fromMillis(0).toUTC();
	distroInfo;
	constructor(distroInfo) {
		this.distroInfo = distroInfo;
	}
	getVersionByLts(input) {
		this.build();
		const schedule = this.ltsToVer.get(input);
		if (schedule) return schedule.version;
		return input;
	}
	getLtsByVersion(input) {
		this.build();
		const di = this.verToLts.get(input);
		if (di) return di.series;
		return input;
	}
	has(version) {
		this.build();
		return this.ltsToVer.has(version);
	}
	schedule(version) {
		this.build();
		let schedule = void 0;
		if (this.verToLts.has(version)) schedule = this.verToLts.get(version);
		if (this.ltsToVer.has(version)) schedule = this.ltsToVer.get(version);
		return schedule;
	}
	build() {
		const now = DateTime.now().toUTC();
		if (now < this.timestamp.plus(refreshInterval)) return;
		logger.debug("RollingReleasesData - data written");
		this.timestamp = now;
		for (let i = 0; i < 3; i++) {
			const di = this.distroInfo.getNLatest(i);
			if (!di) return;
			let prefix = "";
			for (let j = 0; j < i; j++) prefix += "old";
			di.series = `${prefix}stable`;
			this.ltsToVer.set(di.series, di);
			this.verToLts.set(di.version, di);
		}
	}
};
//#endregion
export { RollingReleasesData, getDatedContainerImageCodename, getDatedContainerImageSuffix, getDatedContainerImageVersion, isDatedCodeName };

//# sourceMappingURL=common.js.map