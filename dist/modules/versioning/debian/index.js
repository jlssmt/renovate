import { GenericVersioningApi } from "../generic.js";
import { DistroInfo } from "../distro.js";
import { RollingReleasesData, getDatedContainerImageCodename, getDatedContainerImageSuffix, getDatedContainerImageVersion, isDatedCodeName } from "./common.js";
//#region lib/modules/versioning/debian/index.ts
const id = "debian";
var DebianVersioningApi = class extends GenericVersioningApi {
	_distroInfo;
	_rollingReleases;
	constructor() {
		super();
		this._distroInfo = new DistroInfo("data/debian-distro-info.json");
		this._rollingReleases = new RollingReleasesData(this._distroInfo);
	}
	isValid(version) {
		const isValid = super.isValid(version);
		let ver;
		ver = this._rollingReleases.getVersionByLts(version);
		ver = this._distroInfo.getVersionByCodename(ver);
		return isValid && this._distroInfo.isCreated(ver) || isDatedCodeName(version, this._distroInfo);
	}
	isStable(version) {
		if (isDatedCodeName(version, this._distroInfo)) {
			const codename = getDatedContainerImageCodename(version);
			const versionByCodename = this._distroInfo.getVersionByCodename(codename);
			return this._distroInfo.isReleased(versionByCodename) && !this._distroInfo.isEolLts(versionByCodename);
		}
		let ver;
		ver = this._rollingReleases.getVersionByLts(version);
		ver = this._distroInfo.getVersionByCodename(ver);
		return this._distroInfo.isReleased(ver) && !this._distroInfo.isEolLts(ver);
	}
	getNewValue({ currentValue, newVersion }) {
		if (this._rollingReleases.has(currentValue)) return this._rollingReleases.getLtsByVersion(newVersion);
		if (this._distroInfo.isCodename(currentValue)) {
			const di = this._rollingReleases.schedule(newVersion);
			let ver = this._getBaseVersion(newVersion);
			if (di) ver = di.version;
			return this._distroInfo.getCodenameByVersion(ver);
		}
		if (this._rollingReleases.has(newVersion)) return this._rollingReleases.schedule(newVersion).version;
		if (isDatedCodeName(newVersion, this._distroInfo)) return this._getBaseVersion(newVersion);
		return this._distroInfo.getVersionByCodename(newVersion);
	}
	_getBaseVersion(version) {
		if (isDatedCodeName(version, this._distroInfo)) {
			const codename = getDatedContainerImageCodename(version);
			return this._distroInfo.getVersionByCodename(codename);
		}
		return version;
	}
	equals(version, other) {
		if (getDatedContainerImageVersion(version) !== getDatedContainerImageVersion(other)) return false;
		if (getDatedContainerImageSuffix(version) !== getDatedContainerImageSuffix(other)) return false;
		const ver = this._getBaseVersion(version);
		const otherVer = this._getBaseVersion(other);
		return super.equals(ver, otherVer);
	}
	isGreaterThan(version, other) {
		if (!isDatedCodeName(version, this._distroInfo) && !isDatedCodeName(other, this._distroInfo)) return super.isGreaterThan(version, other);
		const xMajor = this.getMajor(version) ?? 0;
		const yMajor = this.getMajor(other) ?? 0;
		if (xMajor > yMajor) return true;
		if (xMajor < yMajor) return false;
		const xMinor = this.getMinor(version) ?? 0;
		const yMinor = this.getMinor(other) ?? 0;
		if (xMinor > yMinor) return true;
		if (xMinor < yMinor) return false;
		const xImageVersion = getDatedContainerImageVersion(version) ?? 0;
		const yImageVersion = getDatedContainerImageVersion(other) ?? 0;
		if (xImageVersion > yImageVersion) return true;
		if (xImageVersion < yImageVersion) return false;
		const xSuffixVersion = getDatedContainerImageSuffix(version) ?? 0;
		const ySuffixVersion = getDatedContainerImageSuffix(other) ?? 0;
		if (xSuffixVersion > ySuffixVersion) return true;
		if (xSuffixVersion < ySuffixVersion) return false;
		return (this.getPatch(version) ?? 0) > (this.getPatch(other) ?? 0);
	}
	getMajor(version) {
		const ver = this._getBaseVersion(version);
		if (this.isValid(ver)) return this._parse(ver).release[0];
		return null;
	}
	getMinor(version) {
		const ver = this._getBaseVersion(version);
		if (this.isValid(ver)) return this._parse(ver)?.release[1] ?? null;
		return null;
	}
	getPatch(version) {
		const ver = this._getBaseVersion(version);
		if (this.isValid(ver)) return this._parse(ver)?.release[2] ?? null;
		return null;
	}
	_parse(version) {
		let ver;
		if (isDatedCodeName(version, this._distroInfo)) {
			const codename = getDatedContainerImageCodename(version);
			ver = this._distroInfo.getVersionByCodename(codename);
		} else {
			ver = this._rollingReleases.getVersionByLts(version);
			ver = this._distroInfo.getVersionByCodename(ver);
		}
		if (!this._distroInfo.exists(ver)) return null;
		return { release: ver.split(".").map(Number) };
	}
};
const api = new DebianVersioningApi();
//#endregion
export { DebianVersioningApi, api, api as default, id };

//# sourceMappingURL=index.js.map