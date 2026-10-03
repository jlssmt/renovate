import { coerceObject } from "../util/object.js";
import { regEx } from "../util/regex.js";
import { addSecretForSanitizing } from "../util/sanitize.js";
import { replaceInterpolatedValuesInObject, validateInterpolatedValues } from "../util/interpolator.js";
import { isPlainObject } from "@sindresorhus/is";
//#region lib/config/secrets.ts
const namePattern = "[A-Za-z][A-Za-z0-9_]*";
const nameRegex = regEx(`^${namePattern}$`);
const secretTemplateRegex = regEx(`{{ *secrets\\.(${namePattern}) *}}`, "g");
const variableTemplateRegex = regEx(`{{ *variables\\.(${namePattern}) *}}`, "g");
const options = {
	secrets: {
		name: "secrets",
		nameRegex,
		templateRegex: secretTemplateRegex
	},
	variables: {
		name: "variables",
		nameRegex,
		templateRegex: variableTemplateRegex
	}
};
function validateNestedInterpolatedValues(config, key) {
	validateInterpolatedValues(config[key], options[key]);
	if (config.repositories) {
		for (const repository of config.repositories) if (isPlainObject(repository)) validateInterpolatedValues(repository[key], options[key]);
	}
}
function validateConfigSecretsAndVariables(config) {
	validateNestedInterpolatedValues(config, "secrets");
	validateNestedInterpolatedValues(config, "variables");
}
/**
* Applies both variables and secrets to the Renovate config by interpolating values
*/
function applySecretsAndVariablesToConfig(applyConfig) {
	const { config, deleteSecrets, deleteVariables } = applyConfig;
	const secrets = applyConfig.secrets ?? config.secrets;
	const variables = applyConfig.variables ?? config.variables;
	if (isPlainObject(secrets)) for (const secret of Object.values(secrets)) addSecretForSanitizing(secret);
	const configWithVars = replaceInterpolatedValuesInObject(config, coerceObject(variables), options.variables, deleteVariables);
	return replaceInterpolatedValuesInObject(configWithVars, coerceObject(secrets), options.secrets, deleteSecrets);
}
//#endregion
export { applySecretsAndVariablesToConfig, options, validateConfigSecretsAndVariables };

//# sourceMappingURL=secrets.js.map