import { GlobalConfig } from "../../global.js";
import { common_exports } from "./common.js";
//#region lib/config/presets/local/index.ts
async function getResolver(platform) {
	switch (platform) {
		case "forgejo": return import("../forgejo/index.js");
		case "gitea": return import("../gitea/index.js");
		case "github": return import("../github/index.js");
		case "gitlab": return import("../gitlab/index.js");
		case "azure":
		case "bitbucket":
		case "bitbucket-server":
		case "gerrit": return common_exports;
		case "codecommit":
		case "local":
		case "scm-manager": return null;
	}
}
async function getPreset({ repo, presetName = "default", presetPath, tag }) {
	const platform = GlobalConfig.get("platform");
	// v8 ignore if -- platform always has a default value
	if (!platform) throw new Error(`Missing platform config for local preset.`);
	const resolver = await getResolver(platform);
	if (!resolver) throw new Error(`The platform you're using (${platform}) does not support local presets.`);
	const endpoint = GlobalConfig.get("endpoint");
	return resolver.getPresetFromEndpoint(repo, presetName, presetPath, endpoint, tag);
}
//#endregion
export { getPreset };

//# sourceMappingURL=index.js.map