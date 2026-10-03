import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { getGoogleAuthHostRule, isGoogleArtifactRegistry } from "../util.js";
import { pypiDatasourceId } from "./common.js";
//#region lib/modules/datasource/pypi/host-rules.ts
/**
* Resolves the credentials for a Python package index URL.
*
* The URL's own `user:password@` part - which is often a placeholder such as
* `${USER}:${PASS}@` - does not stop it matching a `matchHost` without
* credentials, as `find()` ignores userinfo when matching. Google Artifact
* Registry is only asked for a token when no host rule supplies credentials,
* so an explicitly configured username/password always wins.
*/
async function findPypiIndexCredentials(indexUrl) {
	const parsedUrl = parseUrl(indexUrl);
	if (!parsedUrl) {
		logger.once.debug(`Failed to parse index URL ${indexUrl}`);
		return {};
	}
	const { username, password } = find({
		hostType: pypiDatasourceId,
		url: parsedUrl.toString()
	});
	if (username ?? password) return {
		username,
		password
	};
	if (isGoogleArtifactRegistry(parsedUrl.hostname)) {
		const googleHostRule = await getGoogleAuthHostRule();
		if (googleHostRule) return {
			username: googleHostRule.username,
			password: googleHostRule.password
		};
		logger.once.debug(`Could not get Google access token (url=${parsedUrl.toString()})`);
	}
	return {};
}
//#endregion
export { findPypiIndexCredentials };

//# sourceMappingURL=host-rules.js.map