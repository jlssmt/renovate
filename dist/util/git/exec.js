import { coerceObject } from "../object.js";
import { regEx } from "../regex.js";
import { coerceArray, deduplicateArray } from "../array.js";
import { getChildEnv } from "../exec/utils.js";
import { getGitEnvironmentVariables } from "./auth.js";
import { exec } from "../exec/index.js";
//#region lib/util/git/exec.ts
const gitConfigEnvironmentVariableRegex = regEx(/^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/);
function getGitExecOptions(execOptions, hostTypes) {
	const childEnv = getChildEnv(execOptions);
	const environmentVariables = getGitEnvironmentVariables(childEnv, hostTypes);
	const gitConfigEnv = {};
	for (const [key, value] of Object.entries(environmentVariables)) if (gitConfigEnvironmentVariableRegex.test(key)) gitConfigEnv[key] = value;
	const gitConfigKeys = Object.keys(gitConfigEnv);
	if (!gitConfigKeys.length) return { ...execOptions };
	return {
		...execOptions,
		env: {
			...execOptions.env,
			...gitConfigEnv
		},
		...execOptions.docker && { docker: {
			...execOptions.docker,
			envVars: deduplicateArray([...coerceArray(execOptions.docker.envVars), ...gitConfigKeys])
		} }
	};
}
function withGitEnvironment(hostTypes = []) {
	return (command, execOptions) => exec(command, getGitExecOptions(coerceObject(execOptions), hostTypes));
}
//#endregion
export { withGitEnvironment };

//# sourceMappingURL=exec.js.map