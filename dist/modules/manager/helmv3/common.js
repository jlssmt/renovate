import { coerceArray } from "../../../util/array.js";
import { fromBase64 } from "../../../util/string.js";
import { addSecretForSanitizing } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { find } from "../../../util/host-rules.js";
import { privateCacheDir } from "../../../util/fs/index.js";
import { ecrRegex, getECRAuthToken } from "../../datasource/docker/ecr.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { removeOCIPrefix } from "./oci.js";
import { quote } from "shlex";
import upath from "upath";
import semver from "semver";
//#region lib/modules/manager/helmv3/common.ts
async function generateLoginCmd(repositoryRule) {
	logger.trace({ repositoryRule }, "Generating Helm registry login command");
	const { hostRule, repository } = repositoryRule;
	const { username, password, token } = hostRule;
	const loginCMD = "helm registry login";
	if (username !== "AWS" && ecrRegex.test(repository)) {
		logger.trace({ repository }, `Using ecr auth for Helm registry`);
		const [, region] = coerceArray(ecrRegex.exec(repository));
		const auth = await getECRAuthToken(region, hostRule);
		if (!auth) return null;
		const [username, password] = fromBase64(auth).split(":");
		if (!username || !password) return null;
		addSecretForSanitizing(username);
		addSecretForSanitizing(password);
		return `${loginCMD} --username ${quote(username)} --password ${quote(password)} ${quote(repository)}`;
	}
	if (username && password) {
		logger.trace({ repository }, `Using basic auth for Helm registry`);
		const hostPart = repository.split("/")[0];
		const cmd = `${loginCMD} --username ${quote(username)} --password ${quote(password)} ${quote(hostPart)}`;
		logger.trace({ host: hostPart }, "Generated Helm registry login command");
		return cmd;
	}
	if (token) {
		const hostPart = repository.split("/")[0];
		return `${loginCMD} --username '' --password ${quote(token)} ${quote(hostPart)}`;
	}
	return null;
}
async function generateRegistryLoginCmd(name, registry) {
	const repository = removeOCIPrefix(registry);
	return generateLoginCmd({
		name,
		repository,
		hostRule: find({
			url: `https://${repository}`,
			hostType: DockerDatasource.id
		})
	});
}
function generateHelmEnvs(helmConstraint) {
	const envs = {};
	if (!helmConstraint || !semver.intersects(helmConstraint, ">=3.8.0")) envs.HELM_EXPERIMENTAL_OCI = "1";
	envs.HELM_REGISTRY_CONFIG = `${upath.join(privateCacheDir(), "registry.json")}`;
	envs.HELM_REPOSITORY_CONFIG = `${upath.join(privateCacheDir(), "repositories.yaml")}`;
	envs.HELM_REPOSITORY_CACHE = `${upath.join(privateCacheDir(), "repositories")}`;
	return envs;
}
//#endregion
export { generateHelmEnvs, generateLoginCmd, generateRegistryLoginCmd };

//# sourceMappingURL=common.js.map