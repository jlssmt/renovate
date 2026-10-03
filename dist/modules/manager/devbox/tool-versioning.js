import { api, id } from "../../versioning/semver/index.js";
import { api as api$1, id as id$1 } from "../../versioning/loose/index.js";
import { api as api$2, id as id$2 } from "../../versioning/node/index.js";
import { api as api$3, id as id$3 } from "../../versioning/python/index.js";
import { api as api$4, id as id$4 } from "../../versioning/ruby/index.js";
//#region lib/modules/manager/devbox/tool-versioning.ts
const devboxToolVersioning = {
	nodejs: {
		api: api$2,
		id: id$2
	},
	ruby: {
		api: api$4,
		id: id$4
	},
	python: {
		api: api$3,
		id: id$3
	},
	jdk: {
		api,
		id
	},
	postgresql: {
		api: api$1,
		id: id$1
	},
	go: {
		api: api$3,
		id: id$3
	}
};
//#endregion
export { devboxToolVersioning };

//# sourceMappingURL=tool-versioning.js.map