import { regEx } from "../../../../../util/regex.js";
import { compile } from "../../../../../util/template/index.js";
import { unemojify } from "../../../../../util/emoji.js";
import { sanitizeMarkdown } from "../../../../../util/markdown.js";
import hbs_template_default from "../changelog/hbs-template.js";
//#region lib/workers/repository/update/pr/body/changelogs.ts
function getChangelogs(config) {
	let releaseNotes = "";
	if (!config.hasReleaseNotes) return releaseNotes;
	for (const upgrade of config.upgrades) if (upgrade.hasReleaseNotes && upgrade.repoName) upgrade.releaseNotesSummaryTitle = `${upgrade.repoName} (${upgrade.depName})`;
	releaseNotes += `\n\n---\n\n${compile(hbs_template_default, config, false)}\n\n`;
	releaseNotes = releaseNotes.replace(regEx(/### \[`vv/g), "### [`v");
	releaseNotes = sanitizeMarkdown(releaseNotes);
	releaseNotes = unemojify(releaseNotes);
	return releaseNotes;
}
//#endregion
export { getChangelogs };

//# sourceMappingURL=changelogs.js.map