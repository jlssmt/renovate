import { presets } from "./merge-confidence.preset.js";
import { presets as presets$1 } from "./abandonments.preset.js";
import { presets as presets$2 } from "./config.preset.js";
import { presets as presets$3 } from "./custom-managers.preset.js";
import { presets as presets$4 } from "./default.preset.js";
import { presets as presets$5 } from "./docker.preset.js";
import { presets as presets$6 } from "./global.preset.js";
import { presets as presets$7 } from "./monorepos.preset.js";
import { presets as presets$8 } from "./group.preset.js";
import { presets as presets$9 } from "./helpers.preset.js";
import { presets as presets$10 } from "./packages.preset.js";
import { presets as presets$11 } from "./preview.preset.js";
import { presets as presets$12 } from "./replacements.preset.js";
import { presets as presets$13 } from "./schedule.preset.js";
import { presets as presets$14 } from "./security.preset.js";
import { presets as presets$15 } from "./workarounds.preset.js";
//#region lib/config/presets/internal/index.ts
const groups = {
	abandonments: presets$1,
	config: presets$2,
	customManagers: presets$3,
	default: presets$4,
	docker: presets$5,
	global: presets$6,
	group: presets$8,
	helpers: presets$9,
	mergeConfidence: presets,
	monorepo: presets$7,
	packages: presets$10,
	preview: presets$11,
	replacements: presets$12,
	schedule: presets$13,
	security: presets$14,
	workarounds: presets$15
};
function getPreset({ repo, presetName }) {
	return groups[repo] && presetName ? groups[repo][presetName] : void 0;
}
function computeInternalPresets() {
	const internalPresets = [];
	for (const k in groups) {
		const v = groups[k];
		for (const kk in v) if (k === "default") {
			internalPresets.push(`:${kk}`);
			internalPresets.push(`default:${kk}`);
		} else internalPresets.push(`${k}:${kk}`);
	}
	return internalPresets;
}
const internalPresetNames = new Set(computeInternalPresets());
function isInternal(preset) {
	if (internalPresetNames.has(preset)) return true;
	const withoutParameterParts = preset.split("(");
	if (withoutParameterParts?.length && internalPresetNames.has(withoutParameterParts[0])) return true;
	return false;
}
//#endregion
export { getPreset, groups, internalPresetNames, isInternal };

//# sourceMappingURL=index.js.map