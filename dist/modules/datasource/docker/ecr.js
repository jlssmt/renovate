import { regEx } from "../../../util/regex.js";
import { addSecretForSanitizing } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ECR } from "@aws-sdk/client-ecr";
//#region lib/modules/datasource/docker/ecr.ts
const ecrRegex = regEx(/\d+\.(?:dkr\.ecr|dkr-ecr)(?:-fips)?\.(?<region>[-a-z0-9]+)\.(?:amazonaws\.com|on\.aws|amazonaws\.com\.cn|on\.amazonwebservices\.com\.cn|amazonaws\.eu|on\.amazonwebservices\.eu|c2s\.ic\.gov|on\.aws\.ic\.gov|sc2s\.sgov\.gov|on\.aws\.scloud|scloud\.adc-e\.uk|on\.cloud-aws\.adc-e\.uk|csp\.hci\.ic\.gov|on\.aws\.hci\.ic\.gov|)/);
const ecrPublicRegex = regEx(/public\.ecr\.aws|ecr-public\.aws\.com/);
async function getECRAuthToken(region, opts) {
	const config = { region };
	if (opts.username === `AWS` && opts.password) {
		logger.trace(`AWS user specified, encoding basic auth credentials for ECR registry`);
		return Buffer.from(`AWS:${opts.password}`).toString("base64");
	}
	if (opts.username && opts.password) {
		logger.trace(`Using AWS accessKey to get Authorization token for ECR registry`);
		config.credentials = {
			accessKeyId: opts.username,
			secretAccessKey: opts.password,
			...opts.token && { sessionToken: opts.token }
		};
	}
	const ecr = new ECR(config);
	try {
		const authorizationToken = (await ecr.getAuthorizationToken({}))?.authorizationData?.[0]?.authorizationToken;
		if (authorizationToken) {
			addSecretForSanitizing(authorizationToken);
			return authorizationToken;
		}
		logger.warn("Could not extract authorizationToken from ECR getAuthorizationToken response");
	} catch (err) {
		logger.trace({ err }, "err");
		logger.warn("ECR getAuthorizationToken error");
	}
	return null;
}
function isECRMaxResultsResponse(resp) {
	const body = resp.body;
	return !!(resp.statusCode === 405 && resp.headers?.["docker-distribution-api-version"] && body?.errors?.[0]?.message?.includes("Member must have value less than or equal to 1000"));
}
function isECRMaxResultsError(err) {
	const resp = err.response;
	return !!resp && isECRMaxResultsResponse(resp);
}
//#endregion
export { ecrPublicRegex, ecrRegex, getECRAuthToken, isECRMaxResultsError, isECRMaxResultsResponse };

//# sourceMappingURL=ecr.js.map