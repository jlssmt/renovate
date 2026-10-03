import { coerceObject } from "../../util/object.js";
import { regEx } from "../../util/regex.js";
import { coerceArray } from "../../util/array.js";
import { logger } from "../../logger/index.js";
import { emojify } from "../../util/emoji.js";
//#region lib/workers/repository/errors-warnings.ts
function getWarnings(config) {
	if (!config.warnings?.length) return "";
	let warningText = `\n# Warnings (${config.warnings.length})\n\n`;
	warningText += `Please correct - or verify that you can safely ignore - these warnings before you merge this PR.\n\n`;
	for (const w of config.warnings) warningText += `-   \`${w.topic}\`: ${w.message}\n`;
	warningText += "\n---\n";
	return warningText;
}
function getErrors(config) {
	if (!config.errors?.length) return "";
	let errorText = `\n# Errors (${config.errors.length})\n\n`;
	errorText += `Renovate has found errors that you should fix (in this branch) before finishing this PR.\n\n`;
	for (const e of config.errors) errorText += `-   \`${e.topic}\`: ${e.message}\n`;
	errorText += "\n---\n";
	return errorText;
}
function getDepWarnings(packageFiles) {
	const warnings = [];
	const warningFiles = [];
	for (const files of Object.values(coerceObject(packageFiles))) for (const file of coerceArray(files)) if (file.packageFile) for (const dep of coerceArray(file.deps)) for (const w of coerceArray(dep.warnings)) {
		const message = w.message;
		if (!warnings.includes(message)) warnings.push(message);
		if (!warningFiles.includes(file.packageFile)) warningFiles.push(file.packageFile);
	}
	if (warnings.length) logger.warn({
		warnings,
		files: warningFiles
	}, "Package lookup failures");
	return {
		warnings,
		warningFiles
	};
}
function getDepWarningsOnboardingPR(packageFiles, config) {
	const { warnings, warningFiles } = getDepWarnings(packageFiles);
	if (config.suppressNotifications?.includes("dependencyLookupWarnings")) return "";
	let warningText = "";
	if (!warnings.length) return "";
	warningText = emojify(`\n---\n> \n> :warning: **Warning**\n> \n`);
	warningText += `> Please correct - or verify that you can safely ignore - these dependency lookup failures before you merge this PR.\n> \n`;
	for (const w of warnings) warningText += `> -   \`${w}\`\n`;
	warningText += `> \n> Files affected: ${warningFiles.map((f) => `\`${f}\``).join(", ")}\n\n`;
	return warningText;
}
function getDepWarningsPR(packageFiles, config, dependencyDashboard) {
	const { warnings } = getDepWarnings(packageFiles);
	if (config.suppressNotifications?.includes("dependencyLookupWarnings")) return "";
	let warningText = "";
	if (!warnings.length) return "";
	warningText = emojify(`\n---\n\n> :warning: **Warning**\n> \n`);
	warningText += "> Some dependencies could not be looked up. ";
	if (dependencyDashboard) {
		const depDashboardMd = config.dependencyDashboardIssue ? `[Dependency Dashboard](../issues/${config.dependencyDashboardIssue})` : "Dependency Dashboard";
		warningText += `Check the ${depDashboardMd} for more information.\n\n`;
	} else warningText += `Check the warning logs for more information.\n\n`;
	return warningText;
}
function getDepWarningsDashboard(packageFiles, config) {
	if (config.suppressNotifications?.includes("dependencyLookupWarnings")) return "";
	const { warnings, warningFiles } = getDepWarnings(packageFiles);
	if (!warnings.length) return "";
	const depWarnings = warnings.map((w) => w.replace(regEx(/^Failed to look up(?: [-\w]+)? dependency /), "")).map((dep) => `\`${dep}\``).join(", ");
	let warningText = emojify(`\n---\n\n> :warning: **Warning**\n> \n> Renovate failed to look up the following dependencies: `);
	warningText += depWarnings;
	warningText += ".\n> \n> Files affected: ";
	warningText += warningFiles.map((f) => `\`${f}\``).join(", ");
	warningText += "\n\n---\n\n";
	return warningText;
}
//#endregion
export { getDepWarningsDashboard, getDepWarningsOnboardingPR, getDepWarningsPR, getErrors, getWarnings };

//# sourceMappingURL=errors-warnings.js.map