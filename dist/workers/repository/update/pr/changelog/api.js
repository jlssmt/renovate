import { BitbucketChangeLogSource } from "./bitbucket/source.js";
import { BitbucketServerChangeLogSource } from "./bitbucket-server/source.js";
import { GiteaChangeLogSource } from "./gitea/source.js";
import { ForgejoChangeLogSource } from "./forgejo/source.js";
import { GitHubChangeLogSource } from "./github/source.js";
import { GitLabChangeLogSource } from "./gitlab/source.js";
//#region lib/workers/repository/update/pr/changelog/api.ts
const api = /* @__PURE__ */ new Map();
api.set("bitbucket", new BitbucketChangeLogSource());
api.set("bitbucket-server", new BitbucketServerChangeLogSource());
api.set("forgejo", new ForgejoChangeLogSource());
api.set("gitea", new GiteaChangeLogSource());
api.set("github", new GitHubChangeLogSource());
api.set("gitlab", new GitLabChangeLogSource());
//#endregion
export { api as default };

//# sourceMappingURL=api.js.map