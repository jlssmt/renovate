import { toArray } from "../../../util/array.js";
import { orgGroups, patternGroups, repoGroups } from "../../../data/monorepo.js";
//#region lib/config/presets/internal/monorepos.preset.ts
const presets = {};
for (const [name, value] of Object.entries(repoGroups)) presets[name] = {
	description: `${name} monorepo`,
	matchSourceUrls: toArray(value)
};
for (const [name, value] of Object.entries(orgGroups)) presets[name] = {
	description: `${name} monorepo`,
	matchSourceUrls: toArray(value).map((url) => `${url}**`)
};
for (const [name, value] of Object.entries(patternGroups)) presets[name] = {
	description: `${name} monorepo`,
	matchPackageNames: toArray(value)
};
//#endregion
export { presets };

//# sourceMappingURL=monorepos.preset.js.map