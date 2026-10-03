import { getOptions } from "./index.js";
import { getEnvName } from "./env.js";
//#region lib/config/options/env-options.ts
function getEnvOptionsMap() {
	const entries = [];
	for (const option of getOptions()) {
		const envName = getEnvName(option);
		if (envName) entries.push([envName, {
			configName: option.name,
			globalOnly: option.globalOnly ?? false,
			inheritConfigSupport: option.inheritConfigSupport ?? false,
			type: option.type
		}]);
	}
	entries.sort(([a], [b]) => a.localeCompare(b));
	return Object.fromEntries(entries);
}
//#endregion
export { getEnvOptionsMap };

//# sourceMappingURL=env-options.js.map