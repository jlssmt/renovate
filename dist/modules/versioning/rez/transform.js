import { regEx } from "../../../util/regex.js";
import { ascendingRange, descendingRange, exactVersion, inclusiveBound, lowerBound, matchVersion, upperBound } from "./pattern.js";
//#region lib/modules/versioning/rez/transform.ts
function getVersionParts(input) {
	const versionParts = input.split("-");
	if (versionParts.length === 1) return [input, ""];
	return [versionParts[0], `-${versionParts[1]}`];
}
function padZeroes(input) {
	if (regEx(/[~^*]/).test(input)) return input;
	const [output, stability] = getVersionParts(input);
	const sections = output.split(".");
	while (sections.length < 3) sections.push("0");
	return `${sections.join(".")}${stability}`;
}
function plus2npm(input) {
	if (input.includes("+")) return `>=${input.replace("+", " ")}`;
	return input;
}
function rez2npm(input) {
	if (matchVersion.test(input)) return input;
	if (exactVersion.test(input)) return input.replace("==", "=");
	if (inclusiveBound.test(input)) return `>=${input.replace(regEx(/\.\./g), " <")}`;
	if (lowerBound.test(input)) return plus2npm(input);
	if (upperBound.test(input)) return input;
	const matchAscRange = ascendingRange.exec(input);
	if (matchAscRange?.groups) {
		const lowerBoundAsc = matchAscRange.groups.range_lower_asc;
		const upperBoundAsc = matchAscRange.groups.range_upper_asc;
		return `${plus2npm(lowerBoundAsc)} ${plus2npm(upperBoundAsc)}`;
	}
	const matchDscRange = descendingRange.exec(input);
	if (matchDscRange?.groups) {
		const upperBoundDesc = matchDscRange.groups.range_upper_desc;
		const lowerBoundDesc = matchDscRange.groups.range_lower_desc;
		return `${plus2npm(lowerBoundDesc)} ${plus2npm(upperBoundDesc)}`;
	}
	return input;
}
function rez2pep440(input) {
	if (matchVersion.test(input)) return input;
	if (exactVersion.test(input)) return input;
	if (inclusiveBound.test(input)) return `>=${input.replace(regEx(/\.\./g), ", <")}`;
	if (lowerBound.test(input)) return plus2npm(input);
	if (upperBound.test(input)) return input;
	const matchAscRange = ascendingRange.exec(input);
	if (matchAscRange?.groups) {
		const lowerBoundAsc = matchAscRange.groups.range_lower_asc;
		const upperBoundAsc = matchAscRange.groups.range_upper_asc;
		return `${plus2npm(lowerBoundAsc)}, ${plus2npm(upperBoundAsc)}`;
	}
	const matchDscRange = descendingRange.exec(input);
	if (matchDscRange?.groups) {
		const upperBoundDesc = matchDscRange.groups.range_upper_desc;
		const lowerBoundDesc = matchDscRange.groups.range_lower_desc;
		return `${plus2npm(lowerBoundDesc)}, ${plus2npm(upperBoundDesc)}`;
	}
	return input;
}
function pep4402rezInclusiveBound(input) {
	return input.split(",").map((v) => v.trim().replace(regEx(/[<>=]/g), "")).join("..");
}
function npm2rezplus(input) {
	return `${input.trim().replace(">=", "")}+`;
}
//#endregion
export { npm2rezplus, padZeroes, pep4402rezInclusiveBound, rez2npm, rez2pep440 };

//# sourceMappingURL=transform.js.map