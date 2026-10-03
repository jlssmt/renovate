import { regEx } from "../../../util/regex.js";
import { api as api$1 } from "../npm/index.js";
function hex2npm(input) {
	return input.replace(regEx(/~>\s*(?<version>\d+\.\d+)$/), "^$<version>").replace(regEx(/~>\s*(?<version>\d+\.\d+\.\d+)/), "~$<version>").replace(regEx(/==|and/), "").replace("or", "||").replace(regEx(/!=\s*(?<version>\d+\.\d+(?:\.\d+.*)?)/), ">$<version> <$<version>").trim();
}
function npm2hex(input) {
	const res = input.split(" ").map((str) => str.trim()).filter((str) => str !== "");
	let output = "";
	const operators = [
		"^",
		"=",
		">",
		"<",
		"<=",
		">=",
		"~>"
	];
	for (let i = 0; i < res.length; i += 1) {
		if (i === res.length - 1) {
			output += res[i];
			break;
		}
		if (i < res.length - 1 && res[i + 1].includes("||")) {
			output += `${res[i]} or `;
			i += 1;
		} else if (operators.includes(res[i])) output += `${res[i]} `;
		else output += `${res[i]} and `;
	}
	return output;
}
function isLessThanRange(version, range) {
	return !!api$1.isLessThanRange?.(hex2npm(version), hex2npm(range));
}
function isValid(input) {
	return !!api$1.isValid(hex2npm(input));
}
function isSingleVersion(constraint) {
	return api$1.isVersion(constraint) || constraint?.startsWith("==") && api$1.isVersion(constraint.substring(2).trim());
}
function getPinnedValue(newVersion) {
	return `== ${newVersion}`;
}
function matches(version, range) {
	return api$1.matches(hex2npm(version), hex2npm(range));
}
function getSatisfyingVersion(versions, range) {
	return api$1.getSatisfyingVersion(versions.map(hex2npm), hex2npm(range));
}
function minSatisfyingVersion(versions, range) {
	return api$1.minSatisfyingVersion(versions.map(hex2npm), hex2npm(range));
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	let newSemver = api$1.getNewValue({
		currentValue: hex2npm(currentValue),
		rangeStrategy,
		currentVersion,
		newVersion
	});
	if (newSemver) {
		newSemver = npm2hex(newSemver);
		if (regEx(/~>\s*(?:\d+\.\d+\.\d+)$/).test(currentValue)) newSemver = newSemver.replace(regEx(/[\^~]\s*(?<version>\d+\.\d+\.\d+)/g), (_str, version) => `~> ${version}`);
		else if (regEx(/~>\s*(?:\d+\.\d+)$/).test(currentValue)) newSemver = newSemver.replace(regEx(/\^\s*(?<version>\d+\.\d+)(?:\.\d+)?/g), (_str, version) => `~> ${version}`);
		else newSemver = newSemver.replace(regEx(/~\s*(?<version>\d+\.\d+\.\d)/g), "~> $<version>");
		if (api$1.isVersion(newSemver)) newSemver = `== ${newSemver}`;
	}
	return newSemver;
}
const api = {
	...api$1,
	isLessThanRange,
	isSingleVersion,
	isValid,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	getNewValue,
	getPinnedValue
};
//#endregion
export { api, api as default, isValid };

//# sourceMappingURL=index.js.map