import { github_exports, id } from "./github/index.js";
import { bitbucket_server_exports, id as id$1 } from "./bitbucket-server/index.js";
import { bitbucket_exports, id as id$2 } from "./bitbucket/index.js";
import { gitlab_exports, id as id$3 } from "./gitlab/index.js";
import { azure_exports, id as id$4 } from "./azure/index.js";
import { codecommit_exports, id as id$5 } from "./codecommit/index.js";
import { gitea_exports, id as id$6 } from "./gitea/index.js";
import { forgejo_exports, id as id$7 } from "./forgejo/index.js";
import { gerrit_exports, id as id$8 } from "./gerrit/index.js";
import { id as id$9, local_exports } from "./local/index.js";
import { id as id$10, scm_manager_exports } from "./scm-manager/index.js";
//#region lib/modules/platform/api.ts
const api = /* @__PURE__ */ new Map();
api.set(id$4, azure_exports);
api.set(id$2, bitbucket_exports);
api.set(id$1, bitbucket_server_exports);
api.set(id$5, codecommit_exports);
api.set(id$7, forgejo_exports);
api.set(id$8, gerrit_exports);
api.set(id$6, gitea_exports);
api.set(id, github_exports);
api.set(id$3, gitlab_exports);
api.set(id$9, local_exports);
api.set(id$10, scm_manager_exports);
//#endregion
export { api as default };

//# sourceMappingURL=api.js.map