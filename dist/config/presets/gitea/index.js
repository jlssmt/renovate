import { giteaHttp } from "../../../modules/platform/gitea/index.js";
import { createPresetSource } from "./common.js";
//#region lib/config/presets/gitea/index.ts
const Endpoint = "https://gitea.com/";
const { fetchJSONFile, getPresetFromEndpoint, getPreset } = createPresetSource(giteaHttp, Endpoint);
//#endregion
export { Endpoint, fetchJSONFile, getPreset, getPresetFromEndpoint };

//# sourceMappingURL=index.js.map