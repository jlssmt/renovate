import { getEnv } from "../../../util/env.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
//#region lib/modules/manager/pip_requirements/common.ts
function cleanRegistryUrls(registryUrls) {
	return registryUrls.map((url) => {
		const cleaned = url.replace(regEx(/^"/), "").replace(regEx(/"$/), "");
		if (!GlobalConfig.get("exposeAllEnv")) return cleaned;
		return cleaned.replace(regEx(/(?:\$[A-Za-z\d_]+)|(?:\${[A-Za-z\d_]+})/g), (match) => {
			const envvar = match.substring(1).replace(regEx(/^{/), "").replace(regEx(/}$/), "");
			return getEnv()[envvar] ?? match;
		});
	});
}
function extractPackageFileFlags(content) {
	let registryUrls = [];
	const additionalRegistryUrls = [];
	const additionalRequirementsFiles = [];
	const additionalConstraintsFiles = [];
	content.split(newlineRegex).forEach((line) => {
		if (line.startsWith("-i ") || line.startsWith("--index-url ")) registryUrls = [line.split(" ")[1]];
		else if (line.startsWith("--extra-index-url ")) {
			const extraUrl = line.substring(18).split(" ")[0];
			additionalRegistryUrls.push(extraUrl);
		} else if (line.startsWith("-r ")) additionalRequirementsFiles.push(line.split(" ")[1]);
		else if (line.startsWith("-c ")) additionalConstraintsFiles.push(line.split(" ")[1]);
	});
	const res = { deps: [] };
	if (registryUrls.length > 0) res.registryUrls = cleanRegistryUrls(registryUrls);
	if (additionalRegistryUrls.length) res.additionalRegistryUrls = cleanRegistryUrls(additionalRegistryUrls);
	if (additionalRequirementsFiles.length) {
		res.managerData ??= {};
		res.managerData.requirementsFiles = additionalRequirementsFiles;
	}
	if (additionalConstraintsFiles.length) {
		res.managerData ??= {};
		res.managerData.constraintsFiles = additionalConstraintsFiles;
	}
	return res;
}
//#endregion
export { extractPackageFileFlags };

//# sourceMappingURL=common.js.map