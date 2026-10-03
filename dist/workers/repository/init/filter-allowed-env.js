import { GlobalConfig } from "../../../config/global.js";
import { matchRegexOrGlobList } from "../../../util/string-match.js";
import { logger } from "../../../logger/index.js";
//#region lib/workers/repository/init/filter-allowed-env.ts
/**
* Enforce the `allowedEnv` allowlist before applying the environment variables to subcommands.
*
* If anything has reached this point from the user (repo config, presets) that isn't allowed according to `allowedEnv`, loudly remove anything with a WARN message.
*
* @param env any `env` configuration from the user (repo config, presets)
* @param [adminSuppliedEnv={}] any `env` that the self-hosted administrator has set. If set, these will always be allowed, regardless of `allowedEnv`
*
* NOTE that we re-apply the admin-supplied `env`, as `env` is not `mergeable: true`, so we need to make sure that we don't accidentally overwrite admin-set `env` from repo config.
*
* A user setting `env` for a value in the `allowedEnv` allowlist will take precedence over a admin-set `env`.
*/
function filterAllowedEnv(env, adminSuppliedEnv = {}) {
	if (!env) return env;
	const allowedEnv = GlobalConfig.get("allowedEnv");
	const allowed = { ...adminSuppliedEnv };
	const denied = [];
	for (const [name, value] of Object.entries(env)) if (adminSuppliedEnv[name] === value || matchRegexOrGlobList(name, allowedEnv)) allowed[name] = value;
	else denied.push(name);
	if (denied.length) logger.warn({ denied }, "Ignoring env variables not permitted by this Renovate instance's `allowedEnv`");
	return allowed;
}
//#endregion
export { filterAllowedEnv };

//# sourceMappingURL=filter-allowed-env.js.map