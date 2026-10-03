import { CONFIG_SECRETS_INVALID, CONFIG_VALIDATION, CONFIG_VARIABLES_INVALID } from "../constants/error-messages.js";
import { capitalize } from "./string.js";
import { logger } from "../logger/index.js";
import { isArray, isPlainObject, isString } from "@sindresorhus/is";
//#region lib/util/interpolator.ts
function validateInterpolatedValues(input, options) {
	if (!input) return;
	const { name, nameRegex } = options;
	const validationErrors = [];
	if (isPlainObject(input)) for (const [key, value] of Object.entries(input)) {
		if (!nameRegex.test(key)) validationErrors.push(`Invalid ${name} name "${key}"`);
		if (!isString(value)) validationErrors.push(`${capitalize(name)} values must be strings. Found type ${typeof value} for ${name} ${key}`);
	}
	else validationErrors.push(`Config ${name}s must be a plain object. Found: ${typeof input}`);
	if (validationErrors.length) {
		logger.error({
			name,
			validationErrors
		}, "Invalid interpolated values configured");
		throw new Error(name === "secrets" ? CONFIG_SECRETS_INVALID : CONFIG_VARIABLES_INVALID);
	}
}
function replaceInterpolatedValuesInString(key, value, input, options) {
	const { name, templateRegex } = options;
	templateRegex.lastIndex = 0;
	if (!templateRegex.test(value)) return value;
	if ([
		"branch",
		"commit",
		"group",
		"pr",
		"semantic"
	].some((prefix) => key.startsWith(prefix))) {
		const error = new Error(CONFIG_VALIDATION);
		error.validationSource = "config";
		error.validationError = `Disallowed ${name} substitution`;
		error.validationMessage = `The field \`${key}\` may not use ${name} substitution`;
		throw error;
	}
	return value.replace(templateRegex, (_, key) => {
		if (input?.[key]) return input[key];
		const error = new Error(CONFIG_VALIDATION);
		error.validationSource = "config";
		error.validationError = `Unknown ${name} name`;
		error.validationMessage = `The following ${name} name was not found in config: ${String(key)}`;
		throw error;
	});
}
function replaceInterpolatedValuesInObject(config_, input, options, deleteValues = true) {
	const config = { ...config_ };
	const { name } = options;
	if (deleteValues) delete config[name];
	for (const [key, value] of Object.entries(config)) {
		if (isPlainObject(value) && key !== "onboardingConfig") config[key] = replaceInterpolatedValuesInObject(value, input, options, deleteValues);
		if (isString(value)) config[key] = replaceInterpolatedValuesInString(key, value, input, options);
		if (isArray(value)) {
			for (const [arrayIndex, arrayItem] of value.entries())
 // v8 ignore else -- TODO: add test #40625
			if (isPlainObject(arrayItem)) value[arrayIndex] = replaceInterpolatedValuesInObject(arrayItem, input, options, deleteValues);
			else if (isString(arrayItem)) value[arrayIndex] = replaceInterpolatedValuesInString(key, arrayItem, input, options);
		}
	}
	return config;
}
//#endregion
export { replaceInterpolatedValuesInObject, validateInterpolatedValues };

//# sourceMappingURL=interpolator.js.map