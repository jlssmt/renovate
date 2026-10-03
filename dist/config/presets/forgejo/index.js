import { forgejoHttp } from "../../../modules/platform/forgejo/index.js";
import { createPresetSource } from "../gitea/common.js";
//#region lib/config/presets/forgejo/index.ts
const Endpoint = "https://code.forgejo.org/";
const { fetchJSONFile, getPresetFromEndpoint, getPreset } = createPresetSource(forgejoHttp, Endpoint);
//#endregion
export { Endpoint, fetchJSONFile, getPreset, getPresetFromEndpoint };

//# sourceMappingURL=index.js.map