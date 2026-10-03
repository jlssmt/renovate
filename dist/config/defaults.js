import { clone } from "../util/clone.js";
import { getOptions } from "./options/index.js";
//#region lib/config/defaults.ts
const defaultValueFactories = {
	boolean: () => true,
	array: () => [],
	string: () => null,
	object: () => null,
	integer: () => null
};
function getDefault(option) {
	return option.default === void 0 ? defaultValueFactories[option.type]() : clone(option.default);
}
function getConfig() {
	const options = getOptions();
	const config = {};
	options.forEach((option) => {
		if (!option.parents || option.parents.includes(".")) config[option.name] = getDefault(option);
	});
	return config;
}
//#endregion
export { getConfig, getDefault };

//# sourceMappingURL=defaults.js.map