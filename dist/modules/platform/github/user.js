import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { GithubHttp } from "../../../util/http/github.js";
//#region lib/modules/platform/github/user.ts
const githubApi = new GithubHttp();
async function getAppDetails(token) {
	try {
		const appData = await githubApi.requestGraphql("query { viewer { login databaseId }}", {
			token,
			count: 1
		});
		if (!appData?.data) throw new Error("Init: Can't get App details");
		return {
			username: appData.data.viewer.login,
			name: appData.data.viewer.login,
			id: appData.data.viewer.databaseId,
			email: null
		};
	} catch (err) {
		if (err instanceof Error && err.message === "rate-limit-exceeded") throw err;
		logger.debug({ err }, "Error authenticating with GitHub");
		throw new Error("Init: Authentication failure");
	}
}
async function getUserDetails(endpoint, token) {
	try {
		const userData = (await githubApi.getJsonUnchecked(`${endpoint}user`, { token })).body;
		return {
			username: userData.login,
			name: userData.name,
			id: userData.id,
			email: userData.email
		};
	} catch (err) {
		logger.debug({ err }, "Error authenticating with GitHub");
		throw new Error("Init: Authentication failure");
	}
}
async function getUserEmail(endpoint, token) {
	try {
		return (await githubApi.getJsonUnchecked(`${endpoint}user/emails`, { token })).body?.[0].email ?? null;
	} catch {
		logger.debug("Cannot read user/emails endpoint on GitHub to retrieve gitAuthor");
		return null;
	}
}
//#endregion
export { getAppDetails, getUserDetails, getUserEmail };

//# sourceMappingURL=user.js.map