import { getEnv } from "../../../../util/env.js";
import readline from "node:readline";
//#region lib/workers/global/config/parse/codespaces.ts
/* v8 ignore next -- Codespaces-only bootstrap that prompts on interactive stdin, untestable in CI */
async function setConfig(config) {
	const env = getEnv();
	if (env.CODESPACES !== "true") return config;
	if (!config.token && env.GITHUB_TOKEN) config.token = env.GITHUB_TOKEN;
	if (!config.repositories?.length) config.repositories = [await readline.promises.createInterface({
		input: process.stdin,
		output: process.stdout
	}).question("\n\nRepository name: ")];
	return config;
}
//#endregion
export { setConfig };

//# sourceMappingURL=codespaces.js.map