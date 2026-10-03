import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { isHttpUrl, joinUrlParts } from "../../../util/url.js";
//#region lib/modules/datasource/terraform-module/utils.ts
function createSDBackendURL(registryURL, sdType, sdResult, subPath) {
	const sdEndpoint = sdResult[sdType] ?? "";
	const fullPath = joinUrlParts(sdEndpoint, subPath);
	if (isHttpUrl(fullPath)) return fullPath;
	return joinUrlParts(registryURL, fullPath);
}
function getRegistryRepository(packageName, registryUrl) {
	let registry;
	const split = packageName.split("/");
	if (split.length > 3 && split[0].includes(".")) registry = split.shift();
	else registry = coerceString(registryUrl);
	if (!regEx(/^https?:\/\//).test(registry)) registry = `https://${registry}`;
	const repository = split.join("/");
	return {
		registry,
		repository
	};
}
//#endregion
export { createSDBackendURL, getRegistryRepository };

//# sourceMappingURL=utils.js.map