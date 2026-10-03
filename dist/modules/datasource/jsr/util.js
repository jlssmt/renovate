import { regEx } from "../../../util/regex.js";
import { isNull } from "@sindresorhus/is";
//#region lib/modules/datasource/jsr/util.ts
function extractJsrPackageName(packageName) {
	const parts = packageName.replace(regEx(/^@/), "").split("/");
	if (parts.length !== 2) return null;
	const [scope, name] = parts;
	if (isNull(parseJsrScopeName(scope))) return null;
	if (isNull(parseJsrPackageName(name))) return null;
	return {
		scope,
		name
	};
}
function parseJsrScopeName(name) {
	if (name.length > 100) return null;
	if (!regEx(/^[a-zA-Z0-9-_]+$/).test(name)) return null;
	return name;
}
function parseJsrPackageName(name) {
	if (name.startsWith("@")) return null;
	if (name.length > 58) return null;
	if (!regEx(/^[a-z0-9-]+$/).test(name)) return null;
	if (name.startsWith("-")) return null;
	return name;
}
//#endregion
export { extractJsrPackageName };

//# sourceMappingURL=util.js.map