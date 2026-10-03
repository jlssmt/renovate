import { regEx } from "../../../../../util/regex.js";
import { toBase64 } from "../../../../../util/string.js";
import { PLATFORM_FAMILIES } from "../../../../../constants/platforms.js";
import { joinUrlParts } from "../../../../../util/url.js";
import { detectPlatform } from "../../../../../util/common.js";
import { compile } from "../../../../../util/template/index.js";
import { platform } from "../../../../../modules/platform/index.js";
import { getDepWarningsPR, getWarnings } from "../../../errors-warnings.js";
import { getChangelogs } from "./changelogs.js";
import { getPrConfigDescription } from "./config-description.js";
import { getControls } from "./controls.js";
import { getPrFooter } from "./footer.js";
import { getPrHeader } from "./header.js";
import { getPrExtraNotes, getPrNotes } from "./notes.js";
import { getPrUpdatesTable } from "./updates-table.js";
//#region lib/workers/repository/update/pr/body/index.ts
function massageUpdateMetadata(config) {
	config.upgrades.forEach((upgrade) => {
		const { homepage, sourceUrl, sourceDirectory, changelogUrl, dependencyUrl } = upgrade;
		let depNameLinked = upgrade.depName;
		let newNameLinked = upgrade.newName;
		const primaryLink = homepage ?? sourceUrl ?? dependencyUrl;
		if (primaryLink) {
			depNameLinked = `[${depNameLinked}](${primaryLink})`;
			newNameLinked = `[${newNameLinked}](${primaryLink})`;
		}
		const sourcePlatform = sourceUrl ? detectPlatform(sourceUrl) : null;
		const sourceRootPath = sourcePlatform ? PLATFORM_FAMILIES[sourcePlatform].webDirPath : "tree/HEAD";
		const otherLinks = [];
		if (sourceUrl && (!!sourceDirectory || homepage)) otherLinks.push(`[source](${getFullSourceUrl(sourceUrl, sourceRootPath, sourceDirectory)})`);
		const templatedChangelogUrl = changelogUrl ? compile(changelogUrl, upgrade, true) : void 0;
		if (templatedChangelogUrl) otherLinks.push(`[changelog](${templatedChangelogUrl})`);
		if (otherLinks.length) depNameLinked += ` (${otherLinks.join(", ")})`;
		upgrade.depNameLinked = depNameLinked;
		upgrade.newNameLinked = newNameLinked;
		const references = [];
		if (homepage) references.push(`[homepage](${homepage})`);
		if (sourceUrl) references.push(`[source](${getFullSourceUrl(sourceUrl, sourceRootPath, sourceDirectory)})`);
		if (templatedChangelogUrl) references.push(`[changelog](${templatedChangelogUrl})`);
		upgrade.references = references.join(", ");
	});
}
function getFullSourceUrl(sourceUrl, sourceRootPath, sourceDirectory) {
	let fullUrl = sourceUrl;
	if (sourceDirectory) fullUrl = joinUrlParts(sourceUrl, sourceRootPath, sourceDirectory);
	return fullUrl;
}
const rebasingRegex = regEx(/\*\*Rebasing\*\*: .*/);
function getPrBody(branchConfig, prBodyConfig, config) {
	massageUpdateMetadata(branchConfig);
	let warnings = "";
	warnings += getWarnings(branchConfig);
	if (branchConfig.packageFiles) warnings += getDepWarningsPR(branchConfig.packageFiles, config, branchConfig.dependencyDashboard);
	const content = {
		header: getPrHeader(branchConfig),
		table: getPrUpdatesTable(branchConfig),
		warnings,
		notes: getPrNotes(branchConfig) + getPrExtraNotes(branchConfig),
		changelogs: getChangelogs(branchConfig),
		configDescription: getPrConfigDescription(branchConfig),
		controls: getControls(),
		footer: getPrFooter(branchConfig)
	};
	let prBody = "";
	if (branchConfig.prBodyTemplate) {
		const prBodyTemplate = branchConfig.prBodyTemplate;
		prBody = compile(prBodyTemplate, content, false);
		prBody = prBody.trim();
		prBody = prBody.replace(regEx(/\n\n\n+/g), "\n\n");
		const prDebugData64 = toBase64(JSON.stringify(prBodyConfig.debugData));
		prBody += `\n<!--renovate-debug:${prDebugData64}-->\n`;
		prBody = platform.massageMarkdown(prBody, config.rebaseLabel);
		if (prBodyConfig?.rebasingNotice) prBody = prBody.replace(rebasingRegex, `**Rebasing**: ${prBodyConfig.rebasingNotice}`);
	}
	return prBody;
}
//#endregion
export { getPrBody };

//# sourceMappingURL=index.js.map