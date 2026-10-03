import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
const regex = regEx("^[0-9a-f]{7,40}$", "i");
var GitVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		if (version?.match(regex)) return {
			release: [
				1,
				0,
				0
			],
			suffix: version
		};
		return null;
	}
	_compare(_version, _other) {
		return -1;
	}
};
const api = new GitVersioningApi();
//#endregion
export { api, api as default };

//# sourceMappingURL=index.js.map