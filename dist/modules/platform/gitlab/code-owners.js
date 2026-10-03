import { regEx } from "../../../util/regex.js";
import ignore from "ignore";
//#region lib/modules/platform/gitlab/code-owners.ts
function extractRulesFromCodeOwnersLines(cleanedLines) {
	let currentSection = {
		name: "",
		defaultUsers: []
	};
	const internalRules = [];
	for (const line of cleanedLines) if (isSectionHeader(line)) currentSection = changeCurrentSection(line);
	else {
		const rule = extractOwnersFromLine(line, currentSection.defaultUsers);
		internalRules.push(rule);
	}
	return internalRules;
}
function changeCurrentSection(line) {
	const lastClosingBracketIndex = line.lastIndexOf("]");
	const sectionName = line.substring(0, lastClosingBracketIndex + 1);
	const remainingLine = line.substring(lastClosingBracketIndex + 1).trim();
	return {
		name: sectionName,
		defaultUsers: remainingLine ? remainingLine.split(regEx(/\s+/)) : []
	};
}
function extractOwnersFromLine(line, defaultUsernames) {
	const [pattern, ...usernames] = line.split(regEx(/\s+/));
	const matchPattern = ignore().add(pattern);
	return {
		usernames: usernames.length > 0 ? usernames : defaultUsernames,
		pattern,
		score: pattern.length,
		match: (path) => matchPattern.ignores(path)
	};
}
function isSectionHeader(line) {
	return line.startsWith("[") || line.startsWith("^[");
}
//#endregion
export { extractRulesFromCodeOwnersLines };

//# sourceMappingURL=code-owners.js.map