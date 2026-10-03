import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/loose/index.ts
const id = "loose";
const versionPattern = regEx(/^[vV]?(?<prefix>\d+(?:\.\d+)*)(?<suffix>.*)$/);
const commitHashPattern = regEx(/^[a-f0-9]{7,40}$/);
const numericPattern = regEx(/^[0-9]+$/);
const sectionIndexes = {
	major: 0,
	minor: 1,
	patch: 2
};
var LooseVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		if (commitHashPattern.test(version) && !numericPattern.test(version)) return null;
		const matches = versionPattern.exec(version);
		if (!matches) return null;
		const { prefix, suffix } = matches.groups;
		const parts = prefix.split(".");
		if (parts.length > 6) return null;
		const releaseBig = parts.map((part) => BigInt(part));
		return {
			release: releaseBig.map(Number),
			releaseBig,
			suffix: suffix || ""
		};
	}
	_compare(version, other) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(other);
		// istanbul ignore if
		if (!(parsed1 && parsed2)) return 1;
		const length = Math.max(parsed1.releaseBig.length, parsed2.releaseBig.length);
		for (let i = 0; i < length; i += 1) {
			const part1 = parsed1.releaseBig[i];
			const part2 = parsed2.releaseBig[i];
			if (part1 === void 0) return -1;
			if (part2 === void 0) return 1;
			if (part1 !== part2) return part1 < part2 ? -1 : 1;
		}
		if (parsed1.suffix && parsed2.suffix) return parsed1.suffix.localeCompare(parsed2.suffix, void 0, { numeric: true });
		if (parsed1.suffix) return -1;
		if (parsed2.suffix) return 1;
		// istanbul ignore next
		return 0;
	}
	isSame(type, a, b) {
		const parsedA = this._parse(a);
		const parsedB = this._parse(b);
		if (!(parsedA && parsedB)) return false;
		const sectionIndex = sectionIndexes[type];
		return (parsedA.releaseBig[sectionIndex] ?? 0n) === (parsedB.releaseBig[sectionIndex] ?? 0n);
	}
};
const api = new LooseVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map