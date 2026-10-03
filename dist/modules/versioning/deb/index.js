import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
const epochPattern = regEx(/^\d+$/);
const upstreamVersionPattern = regEx(/^[-+.:~A-Za-z\d]+$/);
const debianRevisionPattern = regEx(/^[+.~A-Za-z\d]*$/);
const numericPattern = regEx(/\d+/g);
const characterOrder = "~ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-.:";
const numericChars = [
	"0",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9"
];
var DebVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		const epochSplit = version.split(":");
		const epochStr = epochSplit.length > 1 ? epochSplit.shift() : "0";
		const remainingVersion = epochSplit.join(":");
		if (remainingVersion.endsWith("-")) return null;
		const debianSplit = remainingVersion.split("-");
		const debianRevision = debianSplit.length > 1 ? debianSplit.pop() : "";
		const upstreamVersion = debianSplit.join("-");
		if (!epochPattern.test(epochStr) || !upstreamVersionPattern.test(upstreamVersion) || !debianRevisionPattern.test(debianRevision)) return null;
		const release = [...remainingVersion.matchAll(numericPattern)].map((m) => parseInt(m[0], 10));
		return {
			epoch: parseInt(epochStr, 10),
			upstreamVersion,
			debianRevision,
			release,
			suffix: debianRevision
		};
	}
	_compare_string(a, b) {
		let charPos = 0;
		while (charPos < a.length || charPos < b.length) {
			const aChar = a.charAt(charPos);
			const bChar = b.charAt(charPos);
			if (numericChars.includes(aChar) && numericChars.includes(bChar)) {
				let aNumericEnd = charPos + 1;
				while (numericChars.includes(a.charAt(aNumericEnd))) aNumericEnd += 1;
				let bNumericEnd = charPos + 1;
				while (numericChars.includes(b.charAt(bNumericEnd))) bNumericEnd += 1;
				const numericCmp = a.substring(charPos, aNumericEnd).localeCompare(b.substring(charPos, bNumericEnd), void 0, { numeric: true });
				if (numericCmp !== 0) return numericCmp;
				charPos = aNumericEnd;
				continue;
			}
			if (aChar !== bChar) {
				const aPriority = characterOrder.indexOf(numericChars.includes(aChar) || aChar === "" ? " " : aChar);
				const bPriority = characterOrder.indexOf(numericChars.includes(bChar) || bChar === "" ? " " : bChar);
				return Math.sign(aPriority - bPriority);
			}
			charPos += 1;
		}
		return 0;
	}
	_compare(version, other) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(other);
		if (!(parsed1 && parsed2)) return 1;
		if (parsed1.epoch !== parsed2.epoch) return Math.sign(parsed1.epoch - parsed2.epoch);
		const upstreamVersionDifference = this._compare_string(parsed1.upstreamVersion, parsed2.upstreamVersion);
		if (upstreamVersionDifference !== 0) return upstreamVersionDifference;
		return this._compare_string(parsed1.debianRevision, parsed2.debianRevision);
	}
};
const api = new DebVersioningApi();
//#endregion
export { api, api as default };

//# sourceMappingURL=index.js.map