import { regEx } from "../../../util/regex.js";
//#region lib/modules/versioning/nuget/version.ts
function ensureNumber(input) {
	if (!regEx(/^\d+$/).test(input)) return null;
	return Number.parseInt(input, 10);
}
function comparePrereleases(x, y) {
	const xParts = x.split(".");
	const yParts = y.split(".");
	const maxLen = Math.max(xParts.length, yParts.length);
	for (let i = 0; i < maxLen; i += 1) {
		const xPart = xParts[i] ?? "";
		const yPart = yParts[i] ?? "";
		const xNum = ensureNumber(xPart);
		const yNum = ensureNumber(yPart);
		const res = xNum !== null && yNum !== null ? Math.sign(xNum - yNum) : xPart.localeCompare(yPart, void 0, { sensitivity: "base" });
		if (res !== 0) return res;
	}
	return 0;
}
function compare(x, y) {
	const xMajor = x.major;
	const yMajor = y.major;
	const xMinor = x.minor ?? 0;
	const yMinor = y.minor ?? 0;
	const xPatch = x.patch ?? 0;
	const yPatch = y.patch ?? 0;
	const xRevision = x.revision ?? 0;
	const yRevision = y.revision ?? 0;
	if (xMajor !== yMajor) return Math.sign(xMajor - yMajor);
	if (xMinor !== yMinor) return Math.sign(xMinor - yMinor);
	if (xPatch !== yPatch) return Math.sign(xPatch - yPatch);
	if (xRevision !== yRevision) return Math.sign(xRevision - yRevision);
	if (x.prerelease && !y.prerelease) return -1;
	if (!x.prerelease && y.prerelease) return 1;
	if (x.prerelease && y.prerelease) return comparePrereleases(x.prerelease, y.prerelease);
	return 0;
}
function versionToString(version) {
	let res = `${version.major}`;
	if (version.minor !== void 0) res += `.${version.minor}`;
	if (version.patch !== void 0) res += `.${version.patch}`;
	if (version.revision !== void 0) res += `.${version.revision}`;
	if (version.prerelease) res += `-${version.prerelease}`;
	if (version.metadata) res += `+${version.metadata}`;
	return res;
}
//#endregion
export { compare, versionToString };

//# sourceMappingURL=version.js.map