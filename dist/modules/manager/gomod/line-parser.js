import { regEx } from "../../../util/regex.js";
import { isValid as isVersion } from "../../versioning/semver/index.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { GolangVersionDatasource } from "../../datasource/golang-version/index.js";
import semver from "semver";
//#region lib/modules/manager/gomod/line-parser.ts
function trimQuotes(str) {
	return str.replace(regEx(/^"(?<value>.*)"$/), "$<value>");
}
const requireRegex = regEx(/^(?<keyword>require)?\s+(?<module>[^\s]+\/?[^\s]+)\s+(?<version>[^\s]+)(?:\s*\/\/\s*(?<comment>[^\s]+)\s*)?$/);
const replaceRegex = regEx(/^(?<keyword>replace)?\s+(?<module>[^\s]+\/?[^\s]+)\s*=>\s*(?<replacement>[^\s]+)(?:\s+(?<version>[^\s]+))?(?:\s*\/\/\s*(?<comment>[^\s]+)\s*)?$/);
const excludeBlockStartRegex = regEx(/^(?<keyword>exclude)\s+\(\s*$/);
const endBlockRegex = regEx(/^\s*\)\s*$/);
const toolRegex = regEx(/^(?<keyword>tool)?\s+(?<module>[^\s]+\/?[^\s]+)\s*$/);
const goVersionRegex = regEx(/^\s*go\s+(?<version>[^\s]+)\s*$/);
const toolchainVersionRegex = regEx(/^\s*toolchain\s+go(?<version>[^\s]+)\s*$/);
const pseudoVersionRegex = regEx(GoDatasource.pversionRegexp);
const placeholderPseudoVersionRegex = regEx(/^v\d+\.\d+\.\d+-00010101000000-000000000000$/);
function extractDigest(input) {
	return pseudoVersionRegex.exec(input)?.groups?.digest;
}
function isPlaceholderPseudoVersion(version) {
	return placeholderPseudoVersionRegex.test(version);
}
function parseLine(input) {
	const goVersionMatches = goVersionRegex.exec(input)?.groups;
	if (goVersionMatches) {
		const { version: currentValue } = goVersionMatches;
		const dep = {
			datasource: GolangVersionDatasource.id,
			versioning: "go-mod-directive",
			depType: "golang",
			depName: "go",
			currentValue,
			commitMessageTopic: "go module directive"
		};
		if (!semver.validRange(currentValue)) dep.skipReason = "invalid-version";
		return dep;
	}
	const toolchainMatches = toolchainVersionRegex.exec(input)?.groups;
	if (toolchainMatches) {
		const { version: currentValue } = toolchainMatches;
		const dep = {
			datasource: GolangVersionDatasource.id,
			depType: "toolchain",
			depName: "go",
			currentValue,
			commitMessageTopic: "go toolchain directive"
		};
		if (!semver.valid(currentValue)) dep.skipReason = "invalid-version";
		return dep;
	}
	const requireMatches = requireRegex.exec(input)?.groups;
	if (requireMatches) {
		const { keyword, module, version: currentValue, comment } = requireMatches;
		const depName = trimQuotes(module);
		const dep = {
			datasource: GoDatasource.id,
			depType: "require",
			depName,
			currentValue
		};
		if (isVersion(currentValue)) {
			const digest = extractDigest(currentValue);
			if (digest) {
				dep.currentDigest = digest;
				dep.digestOneAndOnly = true;
				dep.versioning = "loose";
				if (isPlaceholderPseudoVersion(currentValue)) dep.skipReason = "invalid-version";
			}
		} else dep.skipReason = "invalid-version";
		if (comment === "indirect") {
			dep.depType = "indirect";
			dep.enabled = false;
		}
		if (!keyword) dep.managerData = { multiLine: true };
		return dep;
	}
	const replaceMatches = replaceRegex.exec(input)?.groups;
	if (replaceMatches) {
		const { keyword, replacement, version: currentValue, comment } = replaceMatches;
		const depName = trimQuotes(replacement);
		const dep = {
			datasource: GoDatasource.id,
			depType: "replace",
			depName,
			currentValue
		};
		if (isVersion(currentValue)) {
			const digest = extractDigest(currentValue);
			if (digest) {
				dep.currentDigest = digest;
				dep.digestOneAndOnly = true;
				dep.versioning = "loose";
				if (isPlaceholderPseudoVersion(currentValue)) dep.skipReason = "invalid-version";
			}
		} else if (currentValue) dep.skipReason = "invalid-version";
		else {
			dep.skipReason = "unspecified-version";
			delete dep.currentValue;
		}
		if (comment === "indirect") {
			dep.depType = "indirect";
			dep.enabled = false;
		}
		if (!keyword) dep.managerData = { multiLine: true };
		if (depName.startsWith("/") || depName.startsWith(".")) dep.skipReason = "local-dependency";
		return dep;
	}
	const toolMatches = toolRegex.exec(input)?.groups;
	if (toolMatches) {
		const { keyword, module } = toolMatches;
		const depName = trimQuotes(module);
		const dep = {
			datasource: GoDatasource.id,
			depType: "tool",
			depName,
			skipReason: "unversioned-reference"
		};
		if (!keyword) dep.managerData = { multiLine: true };
		return dep;
	}
	return null;
}
//#endregion
export { endBlockRegex, excludeBlockStartRegex, parseLine };

//# sourceMappingURL=line-parser.js.map