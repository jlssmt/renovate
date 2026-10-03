import { parseLine } from "./line-parser.js";
import { diffLines } from "diff";
import { markdownTable } from "markdown-table";
//#region lib/modules/manager/gomod/artifacts-extra.ts
function getExtraDeps(goModBefore, goModAfter, excludeDeps) {
	const result = [];
	const diff = diffLines(goModBefore, goModAfter, { newlineIsToken: true });
	const addDeps = {};
	const rmDeps = {};
	for (const { added, removed, value } of diff) {
		if (!added && !removed) continue;
		const res = parseLine(value);
		if (!res) continue;
		const { depName, depType, currentValue } = res;
		if (!depName || !currentValue) continue;
		let expandedDepName = depName;
		if (depType === "toolchain") expandedDepName = `${depName} (${depType})`;
		if (added) addDeps[expandedDepName] = currentValue;
		else rmDeps[expandedDepName] = currentValue;
	}
	for (const [depName, currentValue] of Object.entries(rmDeps)) {
		if (excludeDeps.includes(depName)) continue;
		const newValue = addDeps[depName];
		// v8 ignore else -- needs a removed dep that is not added back
		if (newValue) result.push({
			depName,
			currentValue,
			newValue
		});
	}
	return result;
}
function extraDepsTable(extraDeps) {
	const tableLines = [];
	tableLines.push(["**Package**", "**Change**"]);
	for (const { depName, currentValue, newValue } of extraDeps) {
		const depNameQuoted = `\`${depName}\``;
		const versionChangeQuoted = `\`${currentValue}\` -> \`${newValue}\``;
		tableLines.push([depNameQuoted, versionChangeQuoted]);
	}
	return markdownTable(tableLines, { align: ["l", "l"] });
}
function getExtraDepsNotice(goModBefore, goModAfter, excludeDeps, { minimumReleaseAge }) {
	if (!goModBefore || !goModAfter) return null;
	const extraDeps = getExtraDeps(goModBefore, goModAfter, excludeDeps);
	if (extraDeps.length === 0) return null;
	const noticeLines = ["In order to perform the update(s) described in the table above, Renovate ran the `go get` command, which resulted in the following additional change(s):", "\n"];
	const goUpdated = extraDeps.some(({ depName }) => depName === "go");
	const toolchainUpdated = extraDeps.some(({ depName }) => depName === "go (toolchain)");
	const otherDepsCount = extraDeps.length - (goUpdated ? 1 : 0) - (toolchainUpdated ? 1 : 0);
	if (otherDepsCount === 1) noticeLines.push(`- ${otherDepsCount} additional dependency was updated`);
	else if (otherDepsCount > 1) noticeLines.push(`- ${otherDepsCount} additional dependencies were updated`);
	if (goUpdated) noticeLines.push("- The `go` directive was updated for compatibility reasons");
	if (minimumReleaseAge) {
		noticeLines.push("\n");
		noticeLines.push(`Due to Go's usage of [Minimal Version Selection (MVS)](https://go.dev/ref/mod#minimal-version-selection), these packages have been updated to the minimum version available, so will still abide by \`minimumReleaseAge=${minimumReleaseAge}\``);
	}
	noticeLines.push("\n");
	noticeLines.push("Details:");
	noticeLines.push("\n");
	noticeLines.push(extraDepsTable(extraDeps));
	return noticeLines.join("\n");
}
//#endregion
export { extraDepsTable, getExtraDeps, getExtraDepsNotice };

//# sourceMappingURL=artifacts-extra.js.map