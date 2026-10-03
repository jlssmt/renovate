import { logger } from "../../../../../logger/index.js";
import { compile } from "../../../../../util/template/index.js";
import { emojify } from "../../../../../util/emoji.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/workers/repository/update/pr/body/notes.ts
function getPrNotes(config) {
	const notes = [];
	for (const upgrade of config.upgrades) if (isNonEmptyArray(upgrade.prBodyNotes)) for (const note of upgrade.prBodyNotes) try {
		const res = compile(note, upgrade).trim();
		if (res?.length) notes.push(res);
	} catch (err) {
		logger.debug({ err }, "Error compiling upgrade note");
		notes.push(note);
	}
	return `${[...new Set(notes)].join("\n\n")}\n\n`;
}
function getPrExtraNotes(config) {
	let res = "";
	if (config.upgrades.some((upgrade) => upgrade.gitRef)) res += emojify(":abcd: If you wish to disable git hash updates, add `\":disableDigestUpdates\"` to the extends array in your config.\n\n");
	if (config.updateType === "lockFileMaintenance") res += emojify(":wrench: This Pull Request updates lock files to use the latest dependency versions.\n\n");
	if (config.isPin) res += emojify(`Add the preset \`:preserveSemverRanges\` to your config if you don't want to pin your dependencies.\n\n`);
	return res;
}
//#endregion
export { getPrExtraNotes, getPrNotes };

//# sourceMappingURL=notes.js.map