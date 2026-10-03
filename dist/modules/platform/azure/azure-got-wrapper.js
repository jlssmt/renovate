import { logger } from "../../../logger/index.js";
import { find } from "../../../util/host-rules.js";
import { isProbablyJwt } from "../../../util/http/jwt.js";
import * as azure from "azure-devops-node-api";
import { getBasicHandler, getBearerHandler, getPersonalAccessTokenHandler } from "azure-devops-node-api";
import { DeploymentFlags } from "azure-devops-node-api/interfaces/common/VSSInterfaces.js";
//#region lib/modules/platform/azure/azure-got-wrapper.ts
const hostType = "azure";
let endpoint;
function getAuthenticationHandler(config) {
	if (!config.token && config.username && config.password) return getBasicHandler(config.username, config.password, true);
	if (config.token && isProbablyJwt(config.token)) {
		logger.debug("Using Bearer authentication (JWT detected)");
		return getBearerHandler(config.token, true);
	}
	logger.debug("Using PAT authentication");
	return getPersonalAccessTokenHandler(config.token, true);
}
function azureObj(credentials) {
	const config = credentials ?? find({
		hostType,
		url: endpoint
	});
	if (!config.token && !(config.username && config.password)) throw new Error(`No config found for azure`);
	const authHandler = getAuthenticationHandler(config);
	return new azure.WebApi(endpoint, authHandler, {
		allowRetries: true,
		maxRetries: 2
	});
}
function gitApi(credentials) {
	return azureObj(credentials).getGitApi();
}
function coreApi() {
	return azureObj().getCoreApi();
}
function policyApi() {
	return azureObj().getPolicyApi();
}
function workItemTrackingApi() {
	return azureObj().getWorkItemTrackingApi();
}
async function getAuthenticatedUserId(credentials) {
	try {
		const { authenticatedUser } = await azureObj(credentials).connect();
		if (!authenticatedUser?.id) logger.debug("Azure: authenticated user ID is unavailable");
		return authenticatedUser?.id;
	} catch (err) {
		logger.debug({ err }, "Azure: could not determine authenticated user ID");
		return;
	}
}
/**
* Whether the endpoint is Azure DevOps Services (cloud) rather than Azure
* DevOps Server (on-premises). Read from the location service's
* `_apis/connectionData`, which reports the deployment type authoritatively.
* Defaults to `false` (on-premises) when the type cannot be determined, so
* callers stay on the behaviour that both products support.
*/
async function isHosted() {
	try {
		const { deploymentType } = await azureObj().connect();
		return deploymentType === DeploymentFlags.Hosted || String(deploymentType).toLowerCase() === "hosted";
	} catch (err) {
		logger.debug({ err }, "Azure: could not determine deployment type, assuming on-premises");
		return false;
	}
}
function setEndpoint(e) {
	endpoint = e;
}
//#endregion
export { azureObj, coreApi, getAuthenticatedUserId, gitApi, isHosted, policyApi, setEndpoint, workItemTrackingApi };

//# sourceMappingURL=azure-got-wrapper.js.map