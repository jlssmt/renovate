import { PLATFORM_NOT_FOUND } from "../../constants/error-messages.js";
import { DefaultGitScm } from "./default-scm.js";
import { GerritScm } from "./gerrit/scm.js";
import { GithubScm } from "./github/scm.js";
import { LocalFs } from "./local/scm.js";
//#region lib/modules/platform/scm.ts
const platformScmImpls = /* @__PURE__ */ new Map();
platformScmImpls.set("azure", DefaultGitScm);
platformScmImpls.set("codecommit", DefaultGitScm);
platformScmImpls.set("bitbucket", DefaultGitScm);
platformScmImpls.set("bitbucket-server", DefaultGitScm);
platformScmImpls.set("forgejo", DefaultGitScm);
platformScmImpls.set("gerrit", GerritScm);
platformScmImpls.set("gitea", DefaultGitScm);
platformScmImpls.set("github", GithubScm);
platformScmImpls.set("gitlab", DefaultGitScm);
platformScmImpls.set("local", LocalFs);
platformScmImpls.set("scm-manager", DefaultGitScm);
let _scm;
const scm = new Proxy({}, { get(_target, prop) {
	if (!_scm) throw new Error(PLATFORM_NOT_FOUND);
	return _scm[prop];
} });
function setPlatformScmApi(name) {
	if (!platformScmImpls.has(name)) throw new Error(PLATFORM_NOT_FOUND);
	_scm = new (platformScmImpls.get(name))();
}
//#endregion
export { platformScmImpls, scm, setPlatformScmApi };

//# sourceMappingURL=scm.js.map